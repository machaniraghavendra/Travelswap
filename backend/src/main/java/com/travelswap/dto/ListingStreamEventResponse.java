package com.travelswap.dto;

import java.time.LocalDateTime;

public record ListingStreamEventResponse(
        String eventType,
        String message,
        TicketListingResponse listing,
        LocalDateTime timestamp
) {
}
