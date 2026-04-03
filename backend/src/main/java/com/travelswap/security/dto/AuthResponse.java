package com.travelswap.security.dto;

public record AuthResponse(
        String accessToken,
        long accessTokenExpiresInSeconds,
        String refreshToken,
        UserProfileResponse user
) {
}