package com.travelswap.dto;

import com.travelswap.model.PassengerGender;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record BookSeatPassengerRequest(
        @NotBlank String seatNumber,
        @NotBlank String passengerName,
        @NotNull @Positive Integer passengerAge,
        @NotBlank @Size(min = 8, max = 20) String passengerPhone,
        @NotNull PassengerGender passengerGender
) {
}
