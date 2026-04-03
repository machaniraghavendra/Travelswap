package com.travelswap.dto;

import com.travelswap.model.PassengerGender;

public record PurchaseRequest(
        String buyerContact,
        PassengerGender passengerGender,
        String pickupPoint,
        String droppingPoint
) {
}
