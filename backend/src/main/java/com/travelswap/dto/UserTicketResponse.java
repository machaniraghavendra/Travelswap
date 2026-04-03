package com.travelswap.dto;

import com.travelswap.model.UserTicketStatus;
import com.travelswap.model.PassengerGender;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record UserTicketResponse(
        Long id,
        Long journeyId,
        Long travelId,
        String travelName,
        Long busId,
        String busNumber,
        String busType,
        String routeFrom,
        String routeTo,
        LocalDateTime departureTime,
        String seatNumber,
        String passengerName,
        Integer passengerAge,
        String passengerPhone,
        PassengerGender passengerGender,
        String pickupPoint,
        String droppingPoint,
        String pnr,
        BigDecimal amountPaid,
        UserTicketStatus status,
        LocalDateTime createdAt
) {
}
