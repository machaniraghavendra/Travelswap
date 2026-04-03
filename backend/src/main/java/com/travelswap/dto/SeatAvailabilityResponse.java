package com.travelswap.dto;

public record SeatAvailabilityResponse(
        String seatNumber,
        boolean available,
        boolean windowSeat,
        String bookedGender
) {
}
