package com.travelswap.security.dto;

import com.travelswap.model.UserRole;

public record UserProfileResponse(
        Long id,
        String fullName,
        String email,
        String phone,
        UserRole role
) {
}