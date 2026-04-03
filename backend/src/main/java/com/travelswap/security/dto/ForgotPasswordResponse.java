package com.travelswap.security.dto;

public record ForgotPasswordResponse(
        String message,
        String resetToken
) {
}
