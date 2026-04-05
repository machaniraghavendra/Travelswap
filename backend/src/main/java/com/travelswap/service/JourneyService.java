package com.travelswap.service;

import com.travelswap.dto.BookSeatRequest;
import com.travelswap.dto.BookSeatPassengerRequest;
import com.travelswap.dto.CreateJourneyRequest;
import com.travelswap.dto.JourneyResponse;
import com.travelswap.dto.JourneySeatResponse;
import com.travelswap.dto.RoutePointInput;
import com.travelswap.dto.RoutePointResponse;
import com.travelswap.dto.SeatAvailabilityResponse;
import com.travelswap.dto.TravelOverviewResponse;
import com.travelswap.dto.UpdateJourneyRequest;
import com.travelswap.dto.UserTicketResponse;
import com.travelswap.audit.AuditService;
import com.travelswap.entity.BusEntity;
import com.travelswap.entity.JourneyEntity;
import com.travelswap.entity.TravelEntity;
import com.travelswap.entity.UserEntity;
import com.travelswap.entity.UserTicketEntity;
import com.travelswap.exception.ConflictException;
import com.travelswap.exception.InvalidRequestException;
import com.travelswap.exception.ResourceNotFoundException;
import com.travelswap.model.JourneyStatus;
import com.travelswap.model.PassengerGender;
import com.travelswap.model.SeatDeck;
import com.travelswap.model.UserRole;
import com.travelswap.model.UserTicketStatus;
import com.travelswap.repository.BusRepository;
import com.travelswap.repository.JourneyRepository;
import com.travelswap.repository.TravelRepository;
import com.travelswap.repository.UserTicketRepository;
import com.travelswap.repository.TicketListingRepository;
import com.travelswap.repository.UserRepository;
import com.travelswap.security.CurrentUserService;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.math.RoundingMode;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.IntStream;

@Service
public class JourneyService {

    private static final Set<UserTicketStatus> ACTIVE_TICKET_STATUSES = Set.of(UserTicketStatus.BOOKED, UserTicketStatus.LISTED);

    private final JourneyRepository journeyRepository;
    private final TravelRepository travelRepository;
    private final BusRepository busRepository;
    private final UserTicketRepository userTicketRepository;
    private final TicketListingRepository ticketListingRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final AuditService auditService;

    public JourneyService(
            JourneyRepository journeyRepository,
            TravelRepository travelRepository,
            BusRepository busRepository,
            UserTicketRepository userTicketRepository,
            TicketListingRepository ticketListingRepository,
            UserRepository userRepository,
            CurrentUserService currentUserService,
            AuditService auditService
    ) {
        this.journeyRepository = journeyRepository;
        this.travelRepository = travelRepository;
        this.busRepository = busRepository;
        this.userTicketRepository = userTicketRepository;
        this.ticketListingRepository = ticketListingRepository;
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
        this.auditService = auditService;
    }

    @Transactional
    public JourneyResponse createJourney(CreateJourneyRequest request) {
        UserEntity currentUser = currentUserService.requireCurrentUser();
        ensureRole(currentUser, UserRole.TRAVEL, "Only travel accounts can create journey schedules");

        TravelEntity travel = travelRepository.findById(request.travelId())
                .orElseThrow(() -> new ResourceNotFoundException("Travel not found: " + request.travelId()));
        ensureTravelOwnership(currentUser, travel);

        BusEntity bus = busRepository.findById(request.busId())
                .orElseThrow(() -> new ResourceNotFoundException("Bus not found: " + request.busId()));
        if (!bus.getTravel().getId().equals(travel.getId())) {
            throw new InvalidRequestException("Selected bus does not belong to selected travel");
        }

        JourneyEntity journey = new JourneyEntity();
        journey.setTravel(travel);
        journey.setBus(bus);
        journey.setRouteFrom(request.routeFrom().trim());
        journey.setRouteTo(request.routeTo().trim());
        journey.setPickupPoints(joinRoutePoints(request.pickupPoints(), "pickup"));
        journey.setDroppingPoints(joinRoutePoints(request.droppingPoints(), "dropping"));
        journey.setPreferredDeck(normalizePreferredDeck(request.preferredDeck()));
        journey.setDepartureTime(request.departureTime());
        journey.setBaseFare(request.baseFare().setScale(2, RoundingMode.HALF_UP));
        journey.setAvailableSeats(bus.getSeatCapacity());
        journey.setStatus(JourneyStatus.SCHEDULED);

        return mapJourney(journeyRepository.save(journey));
    }

    @Transactional
    public JourneyResponse updateJourney(Long journeyId, UpdateJourneyRequest request) {
        UserEntity currentUser = currentUserService.requireCurrentUser();
        ensureRole(currentUser, UserRole.TRAVEL, "Only travel accounts can update journey schedules");

        JourneyEntity journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new ResourceNotFoundException("Journey not found: " + journeyId));
        ensureTravelOwnership(currentUser, journey.getTravel());

        int occupiedSeats = (int) userTicketRepository.countActiveByJourney(journeyId, ACTIVE_TICKET_STATUSES);

        journey.setRouteFrom(request.routeFrom().trim());
        journey.setRouteTo(request.routeTo().trim());
        journey.setPickupPoints(joinRoutePoints(request.pickupPoints(), "pickup"));
        journey.setDroppingPoints(joinRoutePoints(request.droppingPoints(), "dropping"));
        journey.setPreferredDeck(normalizePreferredDeck(request.preferredDeck()));
        journey.setDepartureTime(request.departureTime());
        journey.setBaseFare(request.baseFare().setScale(2, RoundingMode.HALF_UP));
        journey.setAvailableSeats(Math.max(0, journey.getBus().getSeatCapacity() - occupiedSeats));
        journey.setStatus(journey.getDepartureTime().isAfter(LocalDateTime.now()) ? JourneyStatus.SCHEDULED : JourneyStatus.CLOSED);

        return mapJourney(journeyRepository.save(journey));
    }

    @Transactional
    public List<JourneyResponse> myJourneys() {
        UserEntity currentUser = currentUserService.requireCurrentUser();
        ensureRole(currentUser, UserRole.TRAVEL, "Only travel accounts can access travel journey schedules");

        return journeyRepository.findByTravelOwnerIdOrderByDepartureTimeAsc(currentUser.getId())
                .stream()
                .map(this::mapJourney)
                .toList();
    }

    @Transactional
    public TravelOverviewResponse travelOverview() {
        UserEntity currentUser = currentUserService.requireCurrentUser();
        ensureRole(currentUser, UserRole.TRAVEL, "Only travel accounts can access travel overview");

        List<JourneyEntity> journeys = journeyRepository.findByTravelOwnerIdOrderByDepartureTimeAsc(currentUser.getId());
        long totalBookedSeats = journeys.stream()
                .mapToLong(journey -> Math.max(0, journey.getBus().getSeatCapacity() - journey.getAvailableSeats()))
                .sum();

        return new TravelOverviewResponse(
                journeys.size(),
                journeys.stream().map(journey -> journey.getBus().getId()).distinct().count(),
                totalBookedSeats,
                currentUser.getBalance() == null ? java.math.BigDecimal.ZERO : currentUser.getBalance(),
                ticketListingRepository.sumTravellerCommissionByTravelOwner(currentUser.getId())
        );
    }

    @Transactional
    public List<JourneyResponse> openJourneys(Optional<String> routeFrom, Optional<String> routeTo, Optional<LocalDate> journeyDate) {
        String safeFrom = routeFrom.orElse("").trim();
        String safeTo = routeTo.orElse("").trim();
        if (safeFrom.isBlank() || safeTo.isBlank()) {
            return List.of();
        }
        List<JourneyEntity> journeys = journeyDate
                .map(date -> {
                    LocalDateTime from = date.atStartOfDay();
                    LocalDateTime to = date.plusDays(1).atStartOfDay();
                    return journeyRepository.findByRouteFromContainingIgnoreCaseAndRouteToContainingIgnoreCaseAndDepartureTimeGreaterThanEqualAndDepartureTimeLessThanAndStatusOrderByDepartureTimeAsc(
                            safeFrom,
                            safeTo,
                            from,
                            to,
                            JourneyStatus.SCHEDULED
                    );
                })
                .orElseGet(() -> journeyRepository.findByRouteFromContainingIgnoreCaseAndRouteToContainingIgnoreCaseAndDepartureTimeAfterAndStatusOrderByDepartureTimeAsc(
                        safeFrom,
                        safeTo,
                        LocalDateTime.now(),
                        JourneyStatus.SCHEDULED
                ));

        return journeys.stream().map(this::mapJourney).toList();
    }

    @Transactional
    public List<String> availableLocations() {
        return java.util.stream.Stream.concat(
                        journeyRepository.findDistinctRouteFrom().stream(),
                        journeyRepository.findDistinctRouteTo().stream()
                )
                .map(value -> value == null ? "" : value.trim())
                .filter(value -> !value.isBlank())
                .distinct()
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();
    }

    @Transactional
    public List<UserTicketResponse> bookSeat(Long journeyId, BookSeatRequest request) {
        UserEntity currentUser = currentUserService.requireCurrentUser();
        ensureRole(currentUser, UserRole.USER, "Only user accounts can book seats");

        JourneyEntity journey = journeyRepository.findByIdForUpdate(journeyId)
                .orElseThrow(() -> new ResourceNotFoundException("Journey not found: " + journeyId));

        if (journey.getStatus() != JourneyStatus.SCHEDULED || journey.getDepartureTime().isBefore(LocalDateTime.now())) {
            throw new ConflictException("Journey is not available for booking");
        }

        if (request == null || request.passengers() == null || request.passengers().isEmpty()) {
            throw new InvalidRequestException("At least one passenger seat selection is required");
        }

        if (journey.getAvailableSeats() < request.passengers().size()) {
            throw new ConflictException("Only " + journey.getAvailableSeats() + " seats are available");
        }

        String pickupPoint = validateJourneyPoint(journey.getPickupPoints(), request.pickupPoint(), "pickup");
        String droppingPoint = validateJourneyPoint(journey.getDroppingPoints(), request.droppingPoint(), "dropping");
        validateBatchSeatSelection(journey, request.passengers());

        List<UserTicketResponse> createdTickets = request.passengers().stream().map(passenger -> {
            UserTicketEntity ticket = new UserTicketEntity();
            ticket.setOwner(currentUser);
            ticket.setJourney(journey);
            ticket.setSeatNumber(passenger.seatNumber().trim().toUpperCase(Locale.ROOT));
            ticket.setPassengerName(passenger.passengerName().trim());
            ticket.setPassengerAge(passenger.passengerAge());
            ticket.setPassengerPhone(passenger.passengerPhone().trim());
            ticket.setPassengerGender(passenger.passengerGender());
            ticket.setPickupPoint(pickupPoint);
            ticket.setDroppingPoint(droppingPoint);
            ticket.setPnr(generatePnr("BK"));
            ticket.setAmountPaid(bookingTotalPayable(journey.getBaseFare()));
            ticket.setStatus(UserTicketStatus.BOOKED);
            return mapTicket(userTicketRepository.save(ticket));
        }).toList();

        journey.setAvailableSeats(journey.getAvailableSeats() - request.passengers().size());
        journeyRepository.save(journey);
        applyBookingSettlement(journey, request.passengers().size(), currentUser);

        return createdTickets;
    }

    @Transactional
    public List<UserTicketResponse> myTickets() {
        UserEntity currentUser = currentUserService.requireCurrentUser();
        ensureRole(currentUser, UserRole.USER, "Only user accounts can access booked tickets");

        return userTicketRepository.findByOwnerIdOrderByJourneyDepartureTimeDesc(currentUser.getId())
                .stream()
                .map(this::mapTicket)
                .toList();
    }

    @Transactional
    public JourneySeatResponse seatPlan(Long journeyId) {
        JourneyEntity journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new ResourceNotFoundException("Journey not found: " + journeyId));

        var bookedSeats = userTicketRepository
                .findByJourneyIdAndStatusInOrderBySeatNumberAsc(journeyId, ACTIVE_TICKET_STATUSES)
                .stream()
                .collect(java.util.stream.Collectors.toMap(
                        ticket -> ticket.getSeatNumber().toUpperCase(Locale.ROOT),
                        ticket -> ticket.getPassengerGender() == null ? null : ticket.getPassengerGender().name(),
                        (left, right) -> left
                ));

        List<String> seatLabels = seatLabels(journey.getBus());
        Set<String> windowSeats = windowSeatLabels(journey.getBus());

        List<SeatAvailabilityResponse> seats = seatLabels.stream()
                .map(seat -> new SeatAvailabilityResponse(
                        seat,
                        !bookedSeats.containsKey(seat.toUpperCase(Locale.ROOT)),
                        windowSeats.contains(seat.toUpperCase(Locale.ROOT)),
                        bookedSeats.get(seat.toUpperCase(Locale.ROOT))
                ))
                .toList();
        SeatDeck preferredDeck = journey.getPreferredDeck() == null ? SeatDeck.BOTH : journey.getPreferredDeck();

        return new JourneySeatResponse(
                journey.getId(),
                journey.getTravel().getName(),
                journey.getBus().getBusNumber(),
                journey.getBus().getBusType(),
                journey.getRouteFrom(),
                journey.getRouteTo(),
                preferredDeck.name(),
                splitRoutePoints(journey.getPickupPoints()),
                splitRoutePoints(journey.getDroppingPoints()),
                journey.getDepartureTime(),
                journey.getBaseFare().setScale(2, RoundingMode.HALF_UP),
                bookingServiceFee(journey.getBaseFare()),
                bookingTaxAmount(journey.getBaseFare()),
                bookingTotalPayable(journey.getBaseFare()),
                journey.getAvailableSeats(),
                seats
        );
    }

    private void ensureRole(UserEntity user, UserRole expected, String message) {
        if (user.getRole() != expected) {
            throw new InvalidRequestException(message);
        }
    }

    private void ensureTravelOwnership(UserEntity currentUser, TravelEntity travel) {
        if (!travel.getOwner().getId().equals(currentUser.getId())) {
            throw new InvalidRequestException("You can manage only your own travel setup");
        }
    }

    private String validateDesiredSeat(JourneyEntity journey, String desiredSeat) {
        if (!seatLabels(journey.getBus()).contains(desiredSeat.toUpperCase(Locale.ROOT))) {
            throw new InvalidRequestException("Selected seat is not part of this bus layout");
        }
        boolean alreadyTaken = userTicketRepository.existsByJourneyIdAndSeatNumberIgnoreCaseAndStatusIn(
                journey.getId(),
                desiredSeat,
                ACTIVE_TICKET_STATUSES
        );
        if (alreadyTaken) {
            throw new ConflictException("Seat " + desiredSeat + " is already booked");
        }
        return desiredSeat;
    }

    private String joinRoutePoints(List<RoutePointInput> points, String label) {
        if (points == null || points.isEmpty()) {
            throw new InvalidRequestException("At least one " + label + " point is required");
        }
        List<String> normalized = points.stream()
                .map(value -> {
                    String point = value == null || value.point() == null ? "" : value.point().trim();
                    String date = value == null || value.date() == null ? "" : value.date().trim();
                    String time = value == null || value.time() == null ? "" : value.time().trim();
                    if (point.isBlank() || date.isBlank() || time.isBlank()) {
                        return "";
                    }
                    return point + "|" + date + "|" + time;
                })
                .filter(value -> !value.isBlank())
                .distinct()
                .toList();
        if (normalized.isEmpty()) {
            throw new InvalidRequestException("At least one " + label + " point is required");
        }
        return String.join(",", normalized);
    }

    private List<RoutePointResponse> splitRoutePoints(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return java.util.Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(value -> {
                    String[] parts = value.split("\\|", 3);
                    String point = parts[0].trim();
                    String date = parts.length > 2 ? parts[1].trim() : "";
                    String time = parts.length > 2 ? parts[2].trim() : (parts.length > 1 ? parts[1].trim() : "");
                    return new RoutePointResponse(point, date, time);
                })
                .toList();
    }

    private String validateJourneyPoint(String csv, String selectedValue, String label) {
        if (selectedValue == null || selectedValue.isBlank()) {
            throw new InvalidRequestException("Please select a " + label + " point");
        }
        String normalized = selectedValue.trim();
        List<RoutePointResponse> points = splitRoutePoints(csv);
        boolean match = points.stream().anyMatch(value -> value.point().equalsIgnoreCase(normalized));
        if (!match) {
            throw new InvalidRequestException("Selected " + label + " point is not valid for this journey");
        }
        return points.stream()
                .map(RoutePointResponse::point)
                .filter(value -> value.equalsIgnoreCase(normalized))
                .findFirst()
                .orElse(normalized);
    }

    private void validateNeighbourGenderRule(Map<String, PassengerGender> seatToGender, String seatNumber, PassengerGender passengerGender) {
        for (String neighbour : adjacentSeats(seatNumber)) {
            PassengerGender neighbourGender = seatToGender.get(neighbour);
            if (neighbourGender != null && neighbourGender != passengerGender) {
                throw new ConflictException("Seat " + seatNumber + " cannot be booked next to " + neighbour + " due to gender seat policy");
            }
        }
    }

    private void validateBatchSeatSelection(JourneyEntity journey, List<BookSeatPassengerRequest> passengers) {
        Map<String, PassengerGender> seatToGender = userTicketRepository
                .findByJourneyIdAndStatusInOrderBySeatNumberAsc(journey.getId(), ACTIVE_TICKET_STATUSES)
                .stream()
                .filter(ticket -> ticket.getPassengerGender() != null)
                .collect(java.util.stream.Collectors.toMap(
                        ticket -> ticket.getSeatNumber().toUpperCase(Locale.ROOT),
                        UserTicketEntity::getPassengerGender,
                        (left, right) -> left
                ));

        Set<String> inRequest = new java.util.HashSet<>();
        for (BookSeatPassengerRequest passenger : passengers) {
            if (passenger.passengerGender() == null) {
                throw new InvalidRequestException("Passenger gender is required for every seat");
            }
            String seat = validateDesiredSeat(journey, passenger.seatNumber().trim().toUpperCase(Locale.ROOT));
            if (!inRequest.add(seat)) {
                throw new InvalidRequestException("Duplicate seat in booking request: " + seat);
            }
            validateNeighbourGenderRule(seatToGender, seat, passenger.passengerGender());
            seatToGender.put(seat, passenger.passengerGender());
        }
    }

    private List<String> adjacentSeats(String seatNumber) {
        java.util.regex.Matcher matcher = Pattern.compile("^([A-Za-z]+)(\\d+)$").matcher(seatNumber);
        if (!matcher.matches()) {
            return List.of();
        }
        String row = matcher.group(1).toUpperCase(Locale.ROOT);
        int col = Integer.parseInt(matcher.group(2));
        return List.of(row + (col - 1), row + (col + 1));
    }

    private JourneyResponse mapJourney(JourneyEntity journey) {
        SeatDeck preferredDeck = journey.getPreferredDeck() == null ? SeatDeck.BOTH : journey.getPreferredDeck();
        return new JourneyResponse(
                journey.getId(),
                journey.getTravel().getId(),
                journey.getTravel().getName(),
                journey.getBus().getId(),
                journey.getBus().getBusNumber(),
                journey.getBus().getBusType(),
                journey.getRouteFrom(),
                journey.getRouteTo(),
                splitRoutePoints(journey.getPickupPoints()),
                splitRoutePoints(journey.getDroppingPoints()),
                preferredDeck,
                journey.getDepartureTime(),
                journey.getBaseFare().setScale(2, RoundingMode.HALF_UP),
                journey.getAvailableSeats(),
                journey.getBus().getSeatCapacity() - journey.getAvailableSeats(),
                journey.getStatus()
        );
    }

    private SeatDeck normalizePreferredDeck(String input) {
        if (input == null || input.isBlank()) {
            return SeatDeck.BOTH;
        }
        try {
            return SeatDeck.valueOf(input.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new InvalidRequestException("Preferred deck must be LOWER, UPPER, or BOTH");
        }
    }

    private UserTicketResponse mapTicket(UserTicketEntity ticket) {
        JourneyEntity journey = ticket.getJourney();
        return new UserTicketResponse(
                ticket.getId(),
                journey.getId(),
                journey.getTravel().getId(),
                journey.getTravel().getName(),
                journey.getBus().getId(),
                journey.getBus().getBusNumber(),
                journey.getBus().getBusType(),
                journey.getRouteFrom(),
                journey.getRouteTo(),
                journey.getDepartureTime(),
                ticket.getSeatNumber(),
                ticket.getPassengerName(),
                ticket.getPassengerAge(),
                ticket.getPassengerPhone(),
                ticket.getPassengerGender(),
                ticket.getPickupPoint(),
                ticket.getDroppingPoint(),
                ticket.getPnr(),
                ticket.getAmountPaid().setScale(2, RoundingMode.HALF_UP),
                ticket.getStatus(),
                ticket.getCreatedAt()
        );
    }

    public String generateTransferPnr() {
        return generatePnr("TR");
    }

    private String generatePnr(String prefix) {
        return prefix + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
    }

    private List<String> seatLabels(BusEntity bus) {
        if (bus.getSeatLayout() == null || bus.getSeatLayout().isBlank()) {
            return IntStream.rangeClosed(1, bus.getSeatCapacity())
                    .mapToObj(index -> "S" + index)
                    .toList();
        }
        return java.util.Arrays.stream(bus.getSeatLayout().split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(value -> value.toUpperCase(Locale.ROOT))
                .toList();
    }

    private Set<String> windowSeatLabels(BusEntity bus) {
        if (bus.getWindowSeatLabels() == null || bus.getWindowSeatLabels().isBlank()) {
            return Set.of();
        }
        return java.util.Arrays.stream(bus.getWindowSeatLabels().split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(value -> value.toUpperCase(Locale.ROOT))
                .collect(java.util.stream.Collectors.toSet());
    }

    private java.math.BigDecimal bookingServiceFee(java.math.BigDecimal baseFare) {
        java.math.BigDecimal normalizedBase = baseFare.setScale(2, RoundingMode.HALF_UP);
        java.math.BigDecimal twoPercent = normalizedBase.multiply(new java.math.BigDecimal("0.02")).setScale(2, RoundingMode.HALF_UP);
        java.math.BigDecimal minimum = new java.math.BigDecimal("20.00");
        return twoPercent.compareTo(minimum) < 0 ? minimum : twoPercent;
    }

    private java.math.BigDecimal bookingTaxAmount(java.math.BigDecimal baseFare) {
        return bookingServiceFee(baseFare).multiply(new java.math.BigDecimal("0.18")).setScale(2, RoundingMode.HALF_UP);
    }

    private java.math.BigDecimal bookingTotalPayable(java.math.BigDecimal baseFare) {
        java.math.BigDecimal normalizedBase = baseFare.setScale(2, RoundingMode.HALF_UP);
        return normalizedBase
                .add(bookingServiceFee(baseFare))
                .add(bookingTaxAmount(baseFare))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private void applyBookingSettlement(JourneyEntity journey, int seatsBooked, UserEntity actor) {
        BigDecimal perSeatPlatformFee = bookingServiceFee(journey.getBaseFare());
        BigDecimal perSeatTravellerCommission = bookingTaxAmount(journey.getBaseFare());
        BigDecimal totalPlatformFee = perSeatPlatformFee.multiply(BigDecimal.valueOf(seatsBooked)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalTravellerCommission = perSeatTravellerCommission.multiply(BigDecimal.valueOf(seatsBooked)).setScale(2, RoundingMode.HALF_UP);

        userRepository.findFirstByRoleOrderByCreatedAtAsc(UserRole.ADMIN).ifPresent(admin -> {
            BigDecimal current = admin.getBalance() == null ? BigDecimal.ZERO : admin.getBalance();
            admin.setBalance(current.add(totalPlatformFee).setScale(2, RoundingMode.HALF_UP));
            userRepository.save(admin);
        });

        UserEntity travelOwner = journey.getTravel().getOwner();
        BigDecimal travelBalance = travelOwner.getBalance() == null ? BigDecimal.ZERO : travelOwner.getBalance();
        travelOwner.setBalance(travelBalance.add(totalTravellerCommission).setScale(2, RoundingMode.HALF_UP));
        userRepository.save(travelOwner);

        auditService.record(
                "BOOKING_SETTLEMENT",
                true,
                200,
                actor,
                "/api/journeys/" + journey.getId() + "/book",
                "Settled booking: platformFee=" + totalPlatformFee + ", travellerCommission=" + totalTravellerCommission + ", seats=" + seatsBooked,
                null,
                null
        );
    }
}
