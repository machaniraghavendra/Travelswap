package com.travelswap.repository;

import com.travelswap.entity.UserEntity;
import com.travelswap.model.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    long countByRole(UserRole role);

    Optional<UserEntity> findFirstByRoleOrderByCreatedAtAsc(UserRole role);

    @Query("select coalesce(sum(user.balance), 0) from UserEntity user where user.role = :role")
    java.math.BigDecimal sumBalanceByRole(UserRole role);
}
