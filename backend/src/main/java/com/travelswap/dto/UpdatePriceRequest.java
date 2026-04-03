package com.travelswap.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record UpdatePriceRequest(
        @NotNull @DecimalMin("1.0") BigDecimal resalePrice
) {
}