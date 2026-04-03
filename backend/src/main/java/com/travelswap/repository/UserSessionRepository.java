package com.travelswap.repository;

import com.travelswap.entity.UserSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserSessionRepository extends JpaRepository<UserSessionEntity, String> {
    Optional<UserSessionEntity> findByRefreshTokenHashAndActiveTrue(String refreshTokenHash);

    List<UserSessionEntity> findByUserIdAndActiveTrueOrderByLastUsedAtDesc(Long userId);
}