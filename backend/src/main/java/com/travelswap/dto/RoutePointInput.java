package com.travelswap.dto;

import jakarta.validation.constraints.NotBlank;

public record RoutePointInput(
        @NotBlank String point,
        @NotBlank String date,
        @NotBlank String time
) {
}
