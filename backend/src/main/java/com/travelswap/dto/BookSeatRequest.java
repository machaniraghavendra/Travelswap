package com.travelswap.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record BookSeatRequest(
        @NotEmpty List<@Valid BookSeatPassengerRequest> passengers,
        @NotBlank String pickupPoint,
        @NotBlank String droppingPoint
) {
}
