document.addEventListener('DOMContentLoaded', () => {
    const teamsRegisteredEl = document.getElementById('teams-registered');
    const seatsEmptyEl = document.getElementById('seats-empty');
    const totalSeatsEl = document.getElementById('total-seats');
    const countdownEl = document.getElementById('countdown');
    const registerButtonContainer = document.getElementById('register-button-container'); // <-- NEW

    // --- 1. Fetch Stats ---
    fetch('/api/stats')
        .then(response => response.json())
        .then(data => {
            teamsRegisteredEl.textContent = data.teamsRegistered;
            seatsEmptyEl.textContent = data.seatsEmpty;
            totalSeatsEl.textContent = data.totalSeats;

            // --- NEW: Show or hide the register button ---
            if (data.registrationsOpen) {
                registerButtonContainer.style.display = 'block';
            } else {
                registerButtonContainer.innerHTML = '<p style="font-weight: bold; color: #e60000;">Registrations are currently closed.</p>';
            }
        })
        .catch(error => console.error('Error fetching stats:', error));

    // --- 2. Countdown Timer Logic ---

    // Set the target date and time: September 13, 2025, at 2:00 PM India Standard Time (IST is UTC+5:30)
    const countdownDate = new Date('2025-09-13T14:00:00+05:30').getTime();

    // Update the countdown every second
    const interval = setInterval(() => {
        // Get the current date and time
        const now = new Date().getTime();
        
        // Find the distance between now and the countdown date
        const distance = countdownDate - now;
        
        // Time calculations for days, hours, minutes and seconds
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        // Display the result in the element with id="countdown"
        if (distance < 0) {
            clearInterval(interval);
            countdownEl.textContent = "The event has started!";
        } else {
            // Use padStart to add a leading zero to numbers less than 10
            countdownEl.textContent = `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
        }
    }, 1000); // Run this function every 1000ms (1 second)
});