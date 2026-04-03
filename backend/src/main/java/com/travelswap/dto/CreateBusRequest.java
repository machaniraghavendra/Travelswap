package com.travelswap.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateBusRequest(
        @NotBlank @Size(min = 3, max = 30) String busNumber,
        @NotBlank @Size(min = 3, max = 30) String busType,
        @NotEmpty List<String> seatLabels,
        List<String> windowSeatLabels,
        @NotBlank @Size(min = 3, max = 80) String driverName,
        @NotBlank @Size(min = 8, max = 20) String driverPhone,
        @NotBlank @Size(min = 3, max = 80) String conductorName,
        @NotBlank @Size(min = 8, max = 20) String conductorPhone,
        @NotBlank @Size(min = 3, max = 300) String amenities
) {
}
