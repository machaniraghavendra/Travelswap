package com.travelswap.service;

import com.travelswap.exception.InvalidRequestException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PricingServiceTest {

    private final PricingService pricingService = new PricingService();

    @Test
    void shouldSuggestLowerPriceWhenDepartureIsNear() {
        BigDecimal suggested = pricingService.suggestResalePrice(new BigDecimal("1000"), LocalDateTime.now().plusMinutes(20));
        assertEquals(new BigDecimal("750.00"), suggested);
    }

    @Test
    void shouldRejectOverrideAboveSystemPrice() {
        assertThrows(InvalidRequestException.class, () ->
                pricingService.validateOverridePrice(new BigDecimal("850"), new BigDecimal("900")));
    }
}
