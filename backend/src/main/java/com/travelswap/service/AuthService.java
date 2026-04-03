package com.travelswap.service;

import com.travelswap.audit.AuditService;
import com.travelswap.entity.TravelEntity;
import com.travelswap.entity.UserEntity;
import com.travelswap.entity.UserSessionEntity;
import com.travelswap.exception.ConflictException;
import com.travelswap.exception.InvalidRequestException;
import com.travelswap.exception.ResourceNotFoundException;
import com.travelswap.model.UserRole;
import com.travelswap.repository.TravelRepository;
import com.travelswap.repository.UserRepository;
import com.travelswap.repository.UserSessionRepository;
import com.travelswap.security.CurrentUserService;
import com.travelswap.security.JwtService;
import com.travelswap.security.TokenUtils;
import com.travelswap.security.dto.AuthResponse;
import com.travelswap.security.dto.LoginRequest;
import com.travelswap.security.dto.LogoutRequest;
import com.travelswap.security.dto.RefreshTokenRequest;
import com.travelswap.security.dto.RegisterRequest;
import com.travelswap.security.dto.ForgotPasswordRequest;
import com.travelswap.security.dto.ForgotPasswordResponse;
import com.travelswap.security.dto.ResetPasswordRequest;
import com.travelswap.security.dto.UserProfileResponse;
import com.travelswap.security.dto.UserSessionResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final UserSessionRepository userSessionRepository;
    private final TravelRepository travelRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final TokenUtils tokenUtils;
    private final CurrentUserService currentUserService;
    private final AuditService auditService;
    private final long refreshTokenTtlDays;

    public AuthService(
            UserRepository userRepository,
            UserSessionRepository userSessionRepository,
            TravelRepository travelRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            TokenUtils tokenUtils,
            CurrentUserService currentUserService,
            AuditService auditService,
            @Value("${security.jwt.refresh-token-ttl-days:14}") long refreshTokenTtlDays
    ) {
        this.userRepository = userRepository;
        this.userSessionRepository = userSessionRepository;
        this.travelRepository = travelRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.tokenUtils = tokenUtils;
        this.currentUserService = currentUserService;
        this.auditService = auditService;
        this.refreshTokenTtlDays = refreshTokenTtlDays;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request, HttpServletRequest httpRequest) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("Email already registered: " + email);
        }

        UserEntity user = new UserEntity();
        user.setFullName(request.fullName().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setPhone(request.phone().trim());
        UserRole accountType = resolveRequestedRole(request.accountType());
        user.setRole(accountType);
        user.setActive(true);

        UserEntity saved = userRepository.save(user);
        if (saved.getRole() == UserRole.TRAVEL) {
            createTravelProfile(saved, request);
        }
        AuthResponse response = createSession(saved, httpRequest, "AUTH_REGISTER");
        auditService.record("AUTH_REGISTER", true, 201, saved, httpRequest.getRequestURI(), "User registered", null, null);
        return response;
    }

    @Transactional
    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email().trim().toLowerCase(Locale.ROOT), request.password())
            );
        } catch (BadCredentialsException badCredentialsException) {
            auditService.record("AUTH_LOGIN", false, 401, null, httpRequest.getRequestURI(), "Invalid login attempt", null, null);
            throw new InvalidRequestException("Invalid email or password");
        }

        UserEntity user = userRepository.findByEmailIgnoreCase(request.email().trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (request.accountType() != null) {
            boolean allowed = switch (request.accountType()) {
                case USER -> user.getRole() == UserRole.USER || user.getRole() == UserRole.ADMIN;
                case TRAVEL -> user.getRole() == UserRole.TRAVEL;
                case ADMIN -> user.getRole() == UserRole.ADMIN;
            };
            if (!allowed) {
                auditService.record("AUTH_LOGIN", false, 403, user, httpRequest.getRequestURI(), "Role mismatch during login", null, null);
                throw new InvalidRequestException("Use the correct login portal for your account type");
            }
        }

        AuthResponse response = createSession(user, httpRequest, "AUTH_LOGIN");
        auditService.record("AUTH_LOGIN", true, 200, user, httpRequest.getRequestURI(), "Login successful", null, null);
        return response;
    }

    @Transactional
    public AuthResponse refresh(RefreshTokenRequest request, HttpServletRequest httpRequest) {
        String hashedRefreshToken = tokenUtils.hashToken(request.refreshToken());
        UserSessionEntity session = userSessionRepository.findByRefreshTokenHashAndActiveTrue(hashedRefreshToken)
                .orElseThrow(() -> new InvalidRequestException("Refresh token is invalid or revoked"));

        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            session.setActive(false);
            userSessionRepository.save(session);
            auditService.record("AUTH_REFRESH", false, 401, session.getUser(), httpRequest.getRequestURI(), "Refresh token expired", null, session.getId());
            throw new InvalidRequestException("Refresh token has expired");
        }

        String nextRefreshToken = tokenUtils.generateRefreshToken();
        session.setRefreshTokenHash(tokenUtils.hashToken(nextRefreshToken));
        session.setLastUsedAt(LocalDateTime.now());
        session.setUserAgent(resolveUserAgent(httpRequest));
        session.setIpAddress(resolveIpAddress(httpRequest));

        UserSessionEntity updatedSession = userSessionRepository.save(session);
        String accessToken = jwtService.generateAccessToken(updatedSession.getUser(), updatedSession.getId());
        auditService.record("AUTH_REFRESH", true, 200, updatedSession.getUser(), httpRequest.getRequestURI(), "Access token refreshed", null, updatedSession.getId());

        return new AuthResponse(
                accessToken,
                jwtService.accessTokenExpiresInSeconds(),
                nextRefreshToken,
                mapUser(updatedSession.getUser())
        );
    }

    @Transactional
    public void logout(LogoutRequest request, HttpServletRequest httpRequest) {
        String hashedRefreshToken = tokenUtils.hashToken(request.refreshToken());
        UserSessionEntity session = userSessionRepository.findByRefreshTokenHashAndActiveTrue(hashedRefreshToken)
                .orElseThrow(() -> new InvalidRequestException("Session not found"));

        session.setActive(false);
        userSessionRepository.save(session);

        auditService.record("AUTH_LOGOUT", true, 200, session.getUser(), httpRequest.getRequestURI(), "Session revoked", null, session.getId());
    }

    public UserProfileResponse me() {
        return mapUser(currentUserService.requireCurrentUser());
    }

    public List<UserSessionResponse> activeSessions() {
        UserEntity currentUser = currentUserService.requireCurrentUser();
        return userSessionRepository.findByUserIdAndActiveTrueOrderByLastUsedAtDesc(currentUser.getId())
                .stream()
                .map(session -> new UserSessionResponse(
                        session.getId(),
                        session.getExpiresAt(),
                        session.getLastUsedAt(),
                        session.getUserAgent(),
                        session.getIpAddress(),
                        session.isActive()
                ))
                .toList();
    }

    @Transactional
    public ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request, HttpServletRequest httpRequest) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        UserEntity user = userRepository.findByEmailIgnoreCase(email).orElse(null);

        if (user == null) {
            auditService.record("AUTH_FORGOT_PASSWORD", true, 200, null, httpRequest.getRequestURI(), "Password reset requested for unknown email", null, null);
            return new ForgotPasswordResponse("If this email exists, a reset token has been generated.", null);
        }

        String rawToken = UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase(Locale.ROOT);
        user.setPasswordResetTokenHash(tokenUtils.hashToken(rawToken));
        user.setPasswordResetExpiresAt(LocalDateTime.now().plusMinutes(15));
        userRepository.save(user);

        auditService.record("AUTH_FORGOT_PASSWORD", true, 200, user, httpRequest.getRequestURI(), "Password reset token generated", null, null);
        return new ForgotPasswordResponse("Reset token generated. Use it to set a new password.", rawToken);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request, HttpServletRequest httpRequest) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        UserEntity user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new InvalidRequestException("Invalid reset token or email"));

        if (user.getPasswordResetTokenHash() == null || user.getPasswordResetExpiresAt() == null) {
            throw new InvalidRequestException("No reset request found. Please request forgot password first.");
        }
        if (user.getPasswordResetExpiresAt().isBefore(LocalDateTime.now())) {
            throw new InvalidRequestException("Reset token has expired. Please request a new token.");
        }
        if (!user.getPasswordResetTokenHash().equals(tokenUtils.hashToken(request.token().trim()))) {
            throw new InvalidRequestException("Invalid reset token or email");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setPasswordResetTokenHash(null);
        user.setPasswordResetExpiresAt(null);
        userRepository.save(user);

        userSessionRepository.findByUserIdAndActiveTrueOrderByLastUsedAtDesc(user.getId()).forEach(session -> {
            session.setActive(false);
            userSessionRepository.save(session);
        });

        auditService.record("AUTH_RESET_PASSWORD", true, 200, user, httpRequest.getRequestURI(), "Password reset completed", null, null);
    }

    @Transactional
    public void revokeSession(String sessionId, HttpServletRequest httpRequest) {
        UserEntity currentUser = currentUserService.requireCurrentUser();
        UserSessionEntity targetSession = userSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        if (!targetSession.getUser().getId().equals(currentUser.getId())) {
            throw new InvalidRequestException("Cannot revoke session of another user");
        }

        targetSession.setActive(false);
        userSessionRepository.save(targetSession);

        auditService.record("AUTH_REVOKE_SESSION", true, 200, currentUser, httpRequest.getRequestURI(), "Session revoked", null, sessionId);
    }

    private AuthResponse createSession(UserEntity user, HttpServletRequest request, String action) {
        String rawRefreshToken = tokenUtils.generateRefreshToken();

        UserSessionEntity session = new UserSessionEntity();
        session.setId(UUID.randomUUID().toString());
        session.setUser(user);
        session.setRefreshTokenHash(tokenUtils.hashToken(rawRefreshToken));
        session.setExpiresAt(LocalDateTime.now().plusDays(refreshTokenTtlDays));
        session.setActive(true);
        session.setUserAgent(resolveUserAgent(request));
        session.setIpAddress(resolveIpAddress(request));

        UserSessionEntity savedSession = userSessionRepository.save(session);
        String accessToken = jwtService.generateAccessToken(user, savedSession.getId());

        log.info("{} successful for user={} sessionId={}", action, user.getEmail(), savedSession.getId());

        return new AuthResponse(
                accessToken,
                jwtService.accessTokenExpiresInSeconds(),
                rawRefreshToken,
                mapUser(user)
        );
    }

    private UserProfileResponse mapUser(UserEntity user) {
        return new UserProfileResponse(user.getId(), user.getFullName(), user.getEmail(), user.getPhone(), user.getRole());
    }

    private UserRole resolveRequestedRole(UserRole requested) {
        if (requested == null) {
            return UserRole.USER;
        }
        if (requested == UserRole.ADMIN) {
            throw new InvalidRequestException("Admin registration is not allowed");
        }
        return requested;
    }

    private void createTravelProfile(UserEntity travelUser, RegisterRequest request) {
        String travelCode = request.travelCode() == null ? "" : request.travelCode().trim().toUpperCase(Locale.ROOT);
        String travelName = request.travelName() == null ? "" : request.travelName().trim();

        if (travelCode.length() < 2) {
            throw new InvalidRequestException("Travel code must be at least 2 characters for TRAVEL sign-up");
        }
        if (travelName.length() < 3) {
            throw new InvalidRequestException("Travel name must be at least 3 characters for TRAVEL sign-up");
        }
        if (travelRepository.existsByCodeIgnoreCase(travelCode)) {
            throw new ConflictException("Travel code already exists: " + travelCode);
        }

        TravelEntity travel = new TravelEntity();
        travel.setName(travelName);
        travel.setCode(travelCode);
        travel.setContactNumber(travelUser.getPhone());
        travel.setOwner(travelUser);
        travelRepository.save(travel);
    }

    private String resolveIpAddress(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr() == null ? "UNKNOWN" : request.getRemoteAddr();
    }

    private String resolveUserAgent(HttpServletRequest request) {
        String userAgent = request.getHeader("User-Agent");
        if (userAgent == null || userAgent.isBlank()) {
            return "UNKNOWN";
        }
        return userAgent.substring(0, Math.min(userAgent.length(), 580));
    }
}
