package com.travelswap.service;

import com.travelswap.dto.BusResponse;
import com.travelswap.dto.CreateBusRequest;
import com.travelswap.dto.TravelResponse;
import com.travelswap.entity.BusEntity;
import com.travelswap.entity.TravelEntity;
import com.travelswap.entity.UserEntity;
import com.travelswap.exception.ConflictException;
import com.travelswap.exception.InvalidRequestException;
import com.travelswap.exception.ResourceNotFoundException;
import com.travelswap.model.UserRole;
import com.travelswap.repository.BusRepository;
import com.travelswap.repository.JourneyRepository;
import com.travelswap.repository.TravelRepository;
import com.travelswap.security.CurrentUserService;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class TravelManagementService {

    private final TravelRepository travelRepository;
    private final BusRepository busRepository;
    private final JourneyRepository journeyRepository;
    private final CurrentUserService currentUserService;

    public TravelManagementService(
            TravelRepository travelRepository,
            BusRepository busRepository,
            JourneyRepository journeyRepository,
            CurrentUserService currentUserService
    ) {
        this.travelRepository = travelRepository;
        this.busRepository = busRepository;
        this.journeyRepository = journeyRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional
    public List<TravelResponse> myTravels() {
        UserEntity owner = currentUserService.requireCurrentUser();
        ensureTravelAccount(owner);
        return travelRepository.findByOwnerIdOrderByCreatedAtDesc(owner.getId())
                .stream()
                .map(this::mapTravelWithBuses)
                .toList();
    }

    @Transactional
    public BusResponse createBus(Long travelId, CreateBusRequest request) {
        TravelEntity travel = getOwnedTravel(travelId);
        List<String> seatLabels = normalizeSeatLabels(request.seatLabels());
        List<String> windowSeatLabels = normalizeWindowSeats(request.windowSeatLabels(), seatLabels);
        String normalizedBusNumber = request.busNumber().trim().toUpperCase(Locale.ROOT);

        if (busRepository.existsByBusNumberIgnoreCase(normalizedBusNumber)) {
            throw new ConflictException("Bus number already exists: " + normalizedBusNumber);
        }

        BusEntity bus = new BusEntity();
        bus.setTravel(travel);
        bus.setBusNumber(normalizedBusNumber);
        bus.setBusType(request.busType().trim());
        bus.setSeatCapacity(seatLabels.size());
        bus.setDriverName(request.driverName().trim());
        bus.setDriverPhone(request.driverPhone().trim());
        bus.setConductorName(request.conductorName().trim());
        bus.setConductorPhone(request.conductorPhone().trim());
        bus.setAmenities(request.amenities().trim());
        bus.setSeatLayout(String.join(",", seatLabels));
        bus.setWindowSeatLabels(windowSeatLabels.isEmpty() ? "" : String.join(",", windowSeatLabels));

        return mapBus(busRepository.save(bus));
    }

    @Transactional
    public BusResponse updateBus(Long travelId, Long busId, CreateBusRequest request) {
        TravelEntity travel = getOwnedTravel(travelId);
        BusEntity bus = busRepository.findById(busId)
                .orElseThrow(() -> new ResourceNotFoundException("Bus not found: " + busId));
        if (!bus.getTravel().getId().equals(travel.getId())) {
            throw new InvalidRequestException("Bus does not belong to selected travel");
        }

        if (journeyRepository.existsByBusId(busId)) {
            throw new ConflictException("Bus can be edited only when there are no journeys created on this bus");
        }

        List<String> seatLabels = normalizeSeatLabels(request.seatLabels());
        List<String> windowSeatLabels = normalizeWindowSeats(request.windowSeatLabels(), seatLabels);
        String normalizedBusNumber = request.busNumber().trim().toUpperCase(Locale.ROOT);

        if (busRepository.existsByBusNumberIgnoreCaseAndIdNot(normalizedBusNumber, busId)) {
            throw new ConflictException("Bus number already exists: " + normalizedBusNumber);
        }

        bus.setBusNumber(normalizedBusNumber);
        bus.setBusType(request.busType().trim());
        bus.setSeatCapacity(seatLabels.size());
        bus.setDriverName(request.driverName().trim());
        bus.setDriverPhone(request.driverPhone().trim());
        bus.setConductorName(request.conductorName().trim());
        bus.setConductorPhone(request.conductorPhone().trim());
        bus.setAmenities(request.amenities().trim());
        bus.setSeatLayout(String.join(",", seatLabels));
        bus.setWindowSeatLabels(windowSeatLabels.isEmpty() ? "" : String.join(",", windowSeatLabels));

        return mapBus(busRepository.save(bus));
    }

    @Transactional
    public List<BusResponse> busesForTravel(Long travelId) {
        getOwnedTravel(travelId);
        return busRepository.findByTravelIdOrderByBusNumberAsc(travelId)
                .stream()
                .map(this::mapBus)
                .toList();
    }

    private TravelEntity getOwnedTravel(Long travelId) {
        UserEntity owner = currentUserService.requireCurrentUser();
        ensureTravelAccount(owner);
        TravelEntity travel = travelRepository.findById(travelId)
                .orElseThrow(() -> new ResourceNotFoundException("Travel not found: " + travelId));

        if (!travel.getOwner().getId().equals(owner.getId())) {
            throw new InvalidRequestException("You can manage only your own travels");
        }
        return travel;
    }

    private void ensureTravelAccount(UserEntity owner) {
        if (owner.getRole() != UserRole.TRAVEL) {
            throw new InvalidRequestException("Only travel accounts can manage travels and buses");
        }
    }

    private TravelResponse mapTravelWithBuses(TravelEntity travel) {
        List<BusResponse> buses = busRepository.findByTravelIdOrderByBusNumberAsc(travel.getId())
                .stream()
                .map(this::mapBus)
                .toList();
        return mapTravel(travel, buses);
    }

    private TravelResponse mapTravel(TravelEntity travel, List<BusResponse> buses) {
        return new TravelResponse(
                travel.getId(),
                travel.getName(),
                travel.getCode(),
                travel.getContactNumber(),
                travel.getOwner().getId(),
                travel.getOwner().getFullName(),
                travel.getCreatedAt(),
                buses
        );
    }

    private BusResponse mapBus(BusEntity bus) {
        List<String> seatLabels = splitLabels(bus.getSeatLayout());
        List<String> windowSeatLabels = splitLabels(bus.getWindowSeatLabels());
        return new BusResponse(
                bus.getId(),
                bus.getTravel().getId(),
                bus.getTravel().getName(),
                bus.getBusNumber(),
                bus.getBusType(),
                bus.getSeatCapacity(),
                seatLabels,
                windowSeatLabels,
                bus.getDriverName(),
                bus.getDriverPhone(),
                bus.getConductorName(),
                bus.getConductorPhone(),
                bus.getAmenities(),
                bus.getCreatedAt()
        );
    }

    private List<String> normalizeSeatLabels(List<String> rawSeatLabels) {
        if (rawSeatLabels == null || rawSeatLabels.isEmpty()) {
            throw new InvalidRequestException("Seat labels are required to design the bus");
        }

        Set<String> unique = new LinkedHashSet<>();
        for (String raw : rawSeatLabels) {
            if (raw == null || raw.isBlank()) {
                continue;
            }
            unique.add(raw.trim().toUpperCase(Locale.ROOT));
        }

        if (unique.size() < 10) {
            throw new InvalidRequestException("Bus design must include at least 10 seats");
        }
        if (unique.size() > 80) {
            throw new InvalidRequestException("Bus design cannot exceed 80 seats");
        }
        return new ArrayList<>(unique);
    }

    private List<String> normalizeWindowSeats(List<String> rawWindowSeats, List<String> seatLabels) {
        if (rawWindowSeats == null || rawWindowSeats.isEmpty()) {
            return List.of();
        }
        Set<String> validSeats = new LinkedHashSet<>(seatLabels);
        List<String> output = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        for (String raw : rawWindowSeats) {
            if (raw == null || raw.isBlank()) {
                continue;
            }
            String normalized = raw.trim().toUpperCase(Locale.ROOT);
            if (!validSeats.contains(normalized)) {
                throw new InvalidRequestException("Window seat " + normalized + " is not part of seat layout");
            }
            if (seen.add(normalized)) {
                output.add(normalized);
            }
        }
        return output;
    }

    private List<String> splitLabels(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return java.util.Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .toList();
    }
}
