package com.travelswap.dto;

import java.time.LocalDateTime;
import java.util.List;

public record TravelResponse(
        Long id,
        String name,
        String code,
        String contactNumber,
        Long ownerUserId,
        String ownerName,
        LocalDateTime createdAt,
        List<BusResponse> buses
) {
}