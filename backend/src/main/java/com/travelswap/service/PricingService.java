package com.travelswap.service;

import com.travelswap.dto.SettlementBreakdown;
import com.travelswap.exception.InvalidRequestException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;

@Service
public class PricingService {

    private static final BigDecimal MIN_PRICE = new BigDecimal("1.00");

    public BigDecimal suggestResalePrice(BigDecimal originalFare, LocalDateTime departureTime) {
        BigDecimal urgencyFactor = resaleUrgencyFactor(minutesToDeparture(departureTime));

        BigDecimal suggested = originalFare.multiply(urgencyFactor).setScale(2, RoundingMode.HALF_UP);
        if (suggested.compareTo(originalFare) > 0) {
            return originalFare.setScale(2, RoundingMode.HALF_UP);
        }
        return suggested;
    }

    public SettlementBreakdown settlementForPurchase(
            BigDecimal resalePrice,
            BigDecimal originalFare,
            LocalDateTime departureTime
    ) {
        long minutesToDeparture = minutesToDeparture(departureTime);
        BigDecimal platformRate = platformFeeRate(minutesToDeparture);
        BigDecimal travellerRate = travellerCommissionRate(minutesToDeparture);

        BigDecimal normalizedResale = resalePrice.setScale(2, RoundingMode.HALF_UP);
        BigDecimal normalizedOriginal = originalFare.setScale(2, RoundingMode.HALF_UP);

        BigDecimal platformFee = normalizedOriginal.multiply(platformRate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal travellerCommission = normalizedOriginal.multiply(travellerRate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal buyerFinalPrice = normalizedResale.add(platformFee).add(travellerCommission).setScale(2, RoundingMode.HALF_UP);
        BigDecimal sellerPayout = normalizedResale;
        BigDecimal sellerLoss = normalizedOriginal.subtract(sellerPayout).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);

        return new SettlementBreakdown(
                platformFee,
                travellerCommission,
                buyerFinalPrice,
                sellerPayout,
                sellerLoss
        );
    }

    public void validateOverridePrice(BigDecimal systemSuggestedPrice, BigDecimal overridePrice) {
        BigDecimal normalizedOverride = overridePrice.setScale(2, RoundingMode.HALF_UP);
        if (normalizedOverride.compareTo(MIN_PRICE) < 0) {
            throw new InvalidRequestException("Resale price must be at least " + MIN_PRICE);
        }

        if (normalizedOverride.compareTo(systemSuggestedPrice) > 0) {
            throw new InvalidRequestException(
                    "Override price must be less than or equal to system price "
                            + systemSuggestedPrice.setScale(2, RoundingMode.HALF_UP)
            );
        }
    }

    private long minutesToDeparture(LocalDateTime departureTime) {
        return Math.max(10, Duration.between(LocalDateTime.now(), departureTime).toMinutes());
    }

    private BigDecimal resaleUrgencyFactor(long minutesToDeparture) {
        if (minutesToDeparture <= 30) {
            return new BigDecimal("0.75");
        }
        if (minutesToDeparture <= 90) {
            return new BigDecimal("0.82");
        }
        if (minutesToDeparture <= 240) {
            return new BigDecimal("0.90");
        }
        return new BigDecimal("0.95");
    }

    private BigDecimal platformFeeRate(long minutesToDeparture) {
        if (minutesToDeparture <= 30) {
            return new BigDecimal("0.10");
        }
        if (minutesToDeparture <= 90) {
            return new BigDecimal("0.08");
        }
        if (minutesToDeparture <= 240) {
            return new BigDecimal("0.06");
        }
        return new BigDecimal("0.04");
    }

    private BigDecimal travellerCommissionRate(long minutesToDeparture) {
        if (minutesToDeparture <= 30) {
            return new BigDecimal("0.30");
        }
        if (minutesToDeparture <= 90) {
            return new BigDecimal("0.22");
        }
        if (minutesToDeparture <= 240) {
            return new BigDecimal("0.14");
        }
        return new BigDecimal("0.08");
    }
}
