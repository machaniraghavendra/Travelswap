package com.travelswap.service;

import com.travelswap.dto.CreateListingRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.regex.Pattern;

@Service
public class TicketVerificationService {

    private static final Pattern PNR_PATTERN = Pattern.compile("^[A-Z0-9]{6,20}$");

    public boolean isAuthentic(CreateListingRequest request) {
        if (request.ticketId() != null && request.ticketId() > 0) {
            return true;
        }

        if (request.sourcePlatform() == null || request.sourcePlatform().isBlank()) {
            return false;
        }
        if (request.operatorName() == null || request.operatorName().isBlank()) {
            return false;
        }
        if (request.routeFrom() == null || request.routeFrom().isBlank()) {
            return false;
        }
        if (request.routeTo() == null || request.routeTo().isBlank()) {
            return false;
        }
        if (request.departureTime() == null || request.departureTime().isBefore(LocalDateTime.now().plusMinutes(10))) {
            return false;
        }
        if (request.seatNumber() == null || request.seatNumber().isBlank()) {
            return false;
        }
        if (request.originalPnr() == null || !PNR_PATTERN.matcher(request.originalPnr().trim().toUpperCase()).matches()) {
            return false;
        }
        if (request.originalFare() == null || request.originalFare().doubleValue() <= 0) {
            return false;
        }
        return true;
    }
}
