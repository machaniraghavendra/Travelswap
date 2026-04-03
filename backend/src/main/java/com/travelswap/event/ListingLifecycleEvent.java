package com.travelswap.event;

import com.travelswap.dto.TicketListingResponse;

public record ListingLifecycleEvent(
        ListingEventType type,
        TicketListingResponse listing,
        String message
) {
}
