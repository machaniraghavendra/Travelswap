package com.travelswap.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record CreateJourneyRequest(
        @NotNull @Positive Long travelId,
        @NotNull @Positive Long busId,
        @NotBlank String routeFrom,
        @NotBlank String routeTo,
        @NotEmpty @Size(max = 20) List<RoutePointInput> pickupPoints,
        @NotEmpty @Size(max = 20) List<RoutePointInput> droppingPoints,
        String preferredDeck,
        @NotNull @Future LocalDateTime departureTime,
        @NotNull @DecimalMin("1.0") BigDecimal baseFare
) {
}
