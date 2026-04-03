package com.travelswap.bootstrap;

import com.travelswap.entity.BusEntity;
import com.travelswap.entity.JourneyEntity;
import com.travelswap.entity.TicketListingEntity;
import com.travelswap.entity.TravelEntity;
import com.travelswap.entity.UserEntity;
import com.travelswap.entity.UserTicketEntity;
import com.travelswap.model.JourneyStatus;
import com.travelswap.model.ListingStatus;
import com.travelswap.model.PassengerGender;
import com.travelswap.model.UserRole;
import com.travelswap.model.UserTicketStatus;
import com.travelswap.model.VerificationStatus;
import com.travelswap.repository.BusRepository;
import com.travelswap.repository.JourneyRepository;
import com.travelswap.repository.TicketListingRepository;
import com.travelswap.repository.TravelRepository;
import com.travelswap.repository.UserRepository;
import com.travelswap.repository.UserTicketRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Component
public class BootstrapDataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final TicketListingRepository ticketListingRepository;
    private final TravelRepository travelRepository;
    private final BusRepository busRepository;
    private final JourneyRepository journeyRepository;
    private final UserTicketRepository userTicketRepository;
    private final PasswordEncoder passwordEncoder;

    public BootstrapDataInitializer(
            UserRepository userRepository,
            TicketListingRepository ticketListingRepository,
            TravelRepository travelRepository,
            BusRepository busRepository,
            JourneyRepository journeyRepository,
            UserTicketRepository userTicketRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.ticketListingRepository = ticketListingRepository;
        this.travelRepository = travelRepository;
        this.busRepository = busRepository;
        this.journeyRepository = journeyRepository;
        this.userTicketRepository = userTicketRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
//        UserEntity seller = userRepository.findByEmailIgnoreCase("seller@travelswap.com")
//                .orElseGet(() -> createUser("Seller One", "seller@travelswap.com", "+91-9000000011", UserRole.USER, "Seller123"));
//
//        UserEntity buyer = userRepository.findByEmailIgnoreCase("buyer@travelswap.com")
//                .orElseGet(() -> createUser("Buyer One", "buyer@travelswap.com", "+91-9000000022", UserRole.USER, "Buyer123"));
//
//        UserEntity travelUser = userRepository.findByEmailIgnoreCase("travel@travelswap.com")
//                .orElseGet(() -> createUser("SRS Travel Ops", "travel@travelswap.com", "+91-9000000033", UserRole.TRAVEL, "Travel123"));

        userRepository.findByEmailIgnoreCase("admin@travelswap.com")
                .orElseGet(() -> createUser("TravelSwap Admin", "admin@travelswap.com", "+91-9000000099", UserRole.ADMIN, "Admin123"));

//        TravelEntity sellerTravel = travelRepository.findByCodeIgnoreCase("SRS")
//                .orElseGet(() -> createTravel("SRS Travels", "SRS", "+91-8001001001", travelUser));
//
//        BusEntity busOne = busRepository.findByTravelIdAndBusNumberIgnoreCase(sellerTravel.getId(), "KA01AB1234")
//                .orElseGet(() -> createBus(
//                        sellerTravel,
//                        "KA01AB1234",
//                        "AC Sleeper",
//                        generateSeats(36),
//                        List.of("S1", "S2", "S35", "S36"),
//                        "WiFi, Charging Port"
//                ));
//        BusEntity busTwo = busRepository.findByTravelIdAndBusNumberIgnoreCase(sellerTravel.getId(), "KA02CD9876")
//                .orElseGet(() -> createBus(
//                        sellerTravel,
//                        "KA02CD9876",
//                        "Semi Sleeper",
//                        generateSeats(40),
//                        List.of("S1", "S2", "S39", "S40"),
//                        "Water Bottle, Blankets"
//                ));
//
//        JourneyEntity journeyOne = journeyRepository.findByTravelOwnerIdOrderByDepartureTimeAsc(travelUser.getId())
//                .stream()
//                .filter(journey -> "Bengaluru".equalsIgnoreCase(journey.getRouteFrom()))
//                .filter(journey -> "Chennai".equalsIgnoreCase(journey.getRouteTo()))
//                .findFirst()
//                .orElseGet(() -> createJourney(
//                        sellerTravel,
//                        busOne,
//                        "Bengaluru",
//                        "Chennai",
//                        "Majestic, Silk Board, Electronic City",
//                        "Koyambedu, Guindy, Tambaram",
//                        LocalDateTime.now().plusHours(4),
//                        new BigDecimal("1250.00"),
//                        25
//                ));
//        JourneyEntity journeyTwo = journeyRepository.findByTravelOwnerIdOrderByDepartureTimeAsc(travelUser.getId())
//                .stream()
//                .filter(journey -> "Hyderabad".equalsIgnoreCase(journey.getRouteFrom()))
//                .filter(journey -> "Vijayawada".equalsIgnoreCase(journey.getRouteTo()))
//                .findFirst()
//                .orElseGet(() -> createJourney(
//                        sellerTravel,
//                        busTwo,
//                        "Hyderabad",
//                        "Vijayawada",
//                        "MGBS, LB Nagar, KPHB",
//                        "Benz Circle, Governorpet",
//                        LocalDateTime.now().plusHours(3),
//                        new BigDecimal("950.00"),
//                        20
//                ));
//
//        if (ticketListingRepository.count() > 0) {
//            return;
//        }
//
//        UserTicketEntity sellerTicketOne = createBookedTicketIfMissing(seller, journeyOne, "S12", new BigDecimal("1250.00"));
//        createBookedTicketIfMissing(buyer, journeyTwo, "S7", new BigDecimal("950.00"));
//
//        TicketListingEntity listingOne = new TicketListingEntity();
//        listingOne.setSourcePlatform(sellerTravel.getCode());
//        listingOne.setOperatorName(sellerTravel.getName());
//        listingOne.setTravel(sellerTravel);
//        listingOne.setBus(busOne);
//        listingOne.setSourceTicket(sellerTicketOne);
//        listingOne.setRouteFrom(journeyOne.getRouteFrom());
//        listingOne.setRouteTo(journeyOne.getRouteTo());
//        listingOne.setDepartureTime(journeyOne.getDepartureTime());
//        listingOne.setSeatNumber(sellerTicketOne.getSeatNumber());
//        listingOne.setOriginalPnr(sellerTicketOne.getPnr());
//        listingOne.setOriginalFare(new BigDecimal("1250.00"));
//        listingOne.setResalePrice(new BigDecimal("1090.00"));
//        listingOne.setBuyerFinalPrice(new BigDecimal("1090.00"));
//        listingOne.setPlatformFee(new BigDecimal("0.00"));
//        listingOne.setTravellerCommission(new BigDecimal("0.00"));
//        listingOne.setStatus(ListingStatus.AVAILABLE);
//        listingOne.setVerificationStatus(VerificationStatus.VERIFIED);
//        listingOne.setSeller(seller);
//        listingOne.setSellerContact(seller.getPhone());
//        sellerTicketOne.setStatus(UserTicketStatus.LISTED);
//        userTicketRepository.save(sellerTicketOne);
//
//        ticketListingRepository.save(listingOne);
    }

    private UserEntity createUser(String name, String email, String phone, UserRole role, String password) {
        UserEntity user = new UserEntity();
        user.setFullName(name);
        user.setEmail(email.toLowerCase(Locale.ROOT));
        user.setPhone(phone);
        user.setRole(role);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setActive(true);
        return userRepository.save(user);
    }

    private TravelEntity createTravel(String name, String code, String contactNumber, UserEntity owner) {
        TravelEntity travel = new TravelEntity();
        travel.setName(name);
        travel.setCode(code.toUpperCase(Locale.ROOT));
        travel.setContactNumber(contactNumber);
        travel.setOwner(owner);
        return travelRepository.save(travel);
    }

    private BusEntity createBus(
            TravelEntity travel,
            String busNumber,
            String busType,
            List<String> seatLabels,
            List<String> windowSeatLabels,
            String driverName,
            String driverPhone,
            String conductorName,
            String conductorPhone,
            String amenities
    ) {
        BusEntity bus = new BusEntity();
        bus.setTravel(travel);
        bus.setBusNumber(busNumber.toUpperCase(Locale.ROOT));
        bus.setBusType(busType);
        bus.setSeatCapacity(seatLabels.size());
        bus.setSeatLayout(String.join(",", seatLabels));
        bus.setWindowSeatLabels(String.join(",", windowSeatLabels));
        bus.setDriverName(driverName);
        bus.setDriverPhone(driverPhone);
        bus.setConductorName(conductorName);
        bus.setConductorPhone(conductorPhone);
        bus.setAmenities(amenities);
        return busRepository.save(bus);
    }

    private List<String> generateSeats(int count) {
        return java.util.stream.IntStream.rangeClosed(1, count).mapToObj(index -> "S" + index).toList();
    }

    private JourneyEntity createJourney(
            TravelEntity travel,
            BusEntity bus,
            String routeFrom,
            String routeTo,
            String pickupPoints,
            String droppingPoints,
            LocalDateTime departureTime,
            BigDecimal baseFare,
            int availableSeats
    ) {
        JourneyEntity journey = new JourneyEntity();
        journey.setTravel(travel);
        journey.setBus(bus);
        journey.setRouteFrom(routeFrom);
        journey.setRouteTo(routeTo);
        journey.setPickupPoints(pickupPoints);
        journey.setDroppingPoints(droppingPoints);
        journey.setDepartureTime(departureTime);
        journey.setBaseFare(baseFare);
        journey.setAvailableSeats(availableSeats);
        journey.setStatus(JourneyStatus.SCHEDULED);
        return journeyRepository.save(journey);
    }

    private UserTicketEntity createBookedTicketIfMissing(UserEntity owner, JourneyEntity journey, String seatNumber, BigDecimal amount) {
        return userTicketRepository.findByOwnerIdAndStatusInOrderByJourneyDepartureTimeAsc(owner.getId(), List.of(UserTicketStatus.BOOKED, UserTicketStatus.LISTED))
                .stream()
                .filter(ticket -> ticket.getJourney().getId().equals(journey.getId()))
                .filter(ticket -> ticket.getSeatNumber().equalsIgnoreCase(seatNumber))
                .findFirst()
                .orElseGet(() -> {
                    UserTicketEntity ticket = new UserTicketEntity();
                    ticket.setOwner(owner);
                    ticket.setJourney(journey);
                    ticket.setSeatNumber(seatNumber.toUpperCase(Locale.ROOT));
                    ticket.setPassengerName(owner.getFullName());
                    ticket.setPassengerAge(30);
                    ticket.setPassengerGender(PassengerGender.MALE);
                    ticket.setPickupPoint("Majestic");
                    ticket.setDroppingPoint("Koyambedu");
                    ticket.setPnr("BK" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT));
                    ticket.setAmountPaid(amount);
                    ticket.setStatus(UserTicketStatus.BOOKED);
                    journey.setAvailableSeats(Math.max(0, journey.getAvailableSeats() - 1));
                    journeyRepository.save(journey);
                    return userTicketRepository.save(ticket);
                });
    }
}
