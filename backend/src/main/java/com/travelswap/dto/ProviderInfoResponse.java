package com.travelswap.dto;

public record ProviderInfoResponse(
        String name,
        String integrationState,
        String supportedFlow
) {
}