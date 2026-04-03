package com.travelswap.dto;

import java.time.LocalDateTime;
import java.util.List;

public record BusResponse(
        Long id,
        Long travelId,
        String travelName,
        String busNumber,
        String busType,
        int seatCapacity,
        List<String> seatLabels,
        List<String> windowSeatLabels,
        String driverName,
        String driverPhone,
        String conductorName,
        String conductorPhone,
        String amenities,
        LocalDateTime createdAt
) {
}
