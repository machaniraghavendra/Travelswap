package com.travelswap.service;

import com.travelswap.dto.AdminOverviewResponse;
import com.travelswap.model.ListingStatus;
import com.travelswap.model.UserRole;
import com.travelswap.repository.BusRepository;
import com.travelswap.repository.TicketListingRepository;
import com.travelswap.repository.TravelRepository;
import com.travelswap.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class AdminOverviewService {

    private final UserRepository userRepository;
    private final TravelRepository travelRepository;
    private final BusRepository busRepository;
    private final TicketListingRepository ticketListingRepository;

    public AdminOverviewService(
            UserRepository userRepository,
            TravelRepository travelRepository,
            BusRepository busRepository,
            TicketListingRepository ticketListingRepository
    ) {
        this.userRepository = userRepository;
        this.travelRepository = travelRepository;
        this.busRepository = busRepository;
        this.ticketListingRepository = ticketListingRepository;
    }

    public AdminOverviewResponse overview() {
        long totalUsers = userRepository.countByRole(UserRole.USER);
        long totalAdmins = userRepository.countByRole(UserRole.ADMIN);
        long totalTravellers = userRepository.countByRole(UserRole.TRAVEL);
        long totalSellers = ticketListingRepository.countDistinctSellers();
        long totalBuyers = ticketListingRepository.countDistinctBuyers();
        long totalTravels = travelRepository.count();
        long totalBuses = busRepository.count();
        long totalListings = ticketListingRepository.count();
        long totalSoldListings = ticketListingRepository.countByStatus(ListingStatus.SOLD);
        BigDecimal resalePlatformFees = money(ticketListingRepository.sumPlatformFeesForSoldListings());
        BigDecimal totalPlatformFees = money(userRepository
                .findFirstByRoleOrderByCreatedAtAsc(UserRole.ADMIN)
                .map(admin -> admin.getBalance() == null ? BigDecimal.ZERO : admin.getBalance())
                .orElse(BigDecimal.ZERO));
        BigDecimal bookingPlatformFees = totalPlatformFees.subtract(resalePlatformFees);
        if (bookingPlatformFees.compareTo(BigDecimal.ZERO) < 0) {
            bookingPlatformFees = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return new AdminOverviewResponse(
                totalUsers,
                totalAdmins,
                totalTravellers,
                totalSellers,
                totalBuyers,
                totalTravels,
                totalBuses,
                totalListings,
                totalSoldListings,
                totalPlatformFees,
                resalePlatformFees,
                bookingPlatformFees
        );
    }

    private BigDecimal money(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}
