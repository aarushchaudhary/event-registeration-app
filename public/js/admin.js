document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('adminToken');

    // 1. Protect the page: If no token is found, redirect to the login page immediately.
    if (!token) {
        window.location.href = '/admin-login.html';
        return; // Stop executing the rest of the script
    }

    // --- Wait for the header to be loaded by main.js, then modify it ---
    document.addEventListener('headerLoaded', () => {
        const logoutButton = document.getElementById('logout-button');
        const siteTitle = document.querySelector('.site-title');

        if (logoutButton) {
            // Make the logout button visible only on this page
            logoutButton.style.display = 'block'; 

            // Add the click event listener for logging out
            logoutButton.addEventListener('click', () => {
                localStorage.removeItem('adminToken');
                window.location.href = '/admin-login.html';
            });
        }
        
        if (siteTitle) {
            // Change the main title to "Admin Dashboard"
            siteTitle.textContent = 'Admin Dashboard';
        }
    });

    // --- Setup for authenticated API requests ---
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // --- Get references to DOM elements ---
    const teamsTbody = document.getElementById('teams-tbody');
    const settingsForm = document.getElementById('settings-form');
    const exportButton = document.getElementById('export-csv-button');
    const modalOverlay = document.getElementById('details-modal-overlay');
    const modalTeamName = document.getElementById('modal-team-name');
    const modalTeamDetails = document.getElementById('modal-team-details');
    const modalCloseButton = document.querySelector('.close-button');
    
    // A variable to hold our teams data for reuse
    let teamsData = []; 
    
    // --- Functions to fetch and render data ---
    const loadTeams = async () => {
        try {
            const response = await fetch('/api/admin/teams', { headers });

            // If the token is invalid or expired, the server will send a 401 or 403 status
            if (response.status === 401 || response.status === 403) {
                 localStorage.removeItem('adminToken');
                 window.location.href = '/admin-login.html';
                 return;
            }
            const teams = await response.json();
            teamsData = teams; // Store the fetched data for exporting and viewing details

            teamsTbody.innerHTML = ''; // Clear existing table rows
            teams.forEach(team => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${team.teamName}</td>
                    <td>${team.teamLeaderName} (${team.teamLeaderPhone})</td>
                    <td><span class="status-badge status-${team.status}">${team.status}</span></td>
                    <td>
                        <div class="action-buttons" style="flex-direction: row; gap: 10px;">
                            <button class="button-red view-btn" data-id="${team._id}" style="background-color: #17a2b8; width: auto; padding: 8px 12px; font-size: 14px;">View</button>
                            ${team.status === 'waitlisted' ? 
                                `<button class="button-red approve-btn" data-id="${team._id}" style="width: auto; padding: 8px 12px; font-size: 14px;">Approve</button>` : 
                                '<span>Approved</span>'}
                        </div>
                    </td>
                `;
                teamsTbody.appendChild(row);
            });
        } catch (error) {
            console.error('Failed to load teams:', error);
        }
    };

    const loadSettings = async () => {
        try {
            const response = await fetch('/api/admin/settings', { headers });
            const settings = await response.json();
            document.getElementById('maxTeams').value = settings.maxTeams || 50;
            document.getElementById('membersPerTeam').value = settings.membersPerTeam || 3;
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };
    
    // Function to open and populate the details modal
    const openDetailsModal = (teamId) => {
        const team = teamsData.find(t => t._id === teamId);
        if (!team) return;

        modalTeamName.textContent = team.teamName;
        
        let membersHtml = '<h3>Team Members</h3><ul>';
        team.members.forEach((member, index) => {
            membersHtml += `
                <li>
                    <strong>Member ${index + 1}:</strong> ${member.name} (${member.sapId})<br>
                    ${member.school} - ${member.course} (${member.year} Year)<br>
                    ${member.email} | ${member.phone}
                </li>`;
        });
        membersHtml += '</ul>';
        
        modalTeamDetails.innerHTML = membersHtml;
        modalOverlay.classList.add('active');
    };

    // --- Function to load all initial data when the page opens ---
    const loadInitialData = () => {
        loadTeams();
        loadSettings();
    };
    
    // --- Event Listeners ---

    // Listen for submissions on the settings form
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const maxTeams = document.getElementById('maxTeams').value;
        const membersPerTeam = document.getElementById('membersPerTeam').value;
        
        try {
            await fetch('/api/admin/settings', {
                method: 'PUT',
                headers,
                body: JSON.stringify({ maxTeams, membersPerTeam })
            });
            alert('Settings saved successfully!');
        } catch (error) {
            alert('Failed to save settings.');
            console.error('Error saving settings:', error);
        }
    });

    // Listen for clicks inside the table body to handle "Approve" and "View" buttons
    teamsTbody.addEventListener('click', async (e) => {
        const target = e.target.closest('button'); // Find the closest button element
        if (!target) return;

        if (target.classList.contains('approve-btn')) {
            const teamId = target.dataset.id;
            await fetch(`/api/admin/teams/${teamId}/approve`, {
                method: 'PUT',
                headers
            });
            loadTeams(); // Refresh the teams list after approval
        } else if (target.classList.contains('view-btn')) {
            const teamId = target.dataset.id;
            openDetailsModal(teamId);
        }
    });
    
    // Event listeners to close the modal
    modalCloseButton.addEventListener('click', () => modalOverlay.classList.remove('active'));
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.classList.remove('active');
        }
    });

    // Event listener for the Export to CSV button
    exportButton.addEventListener('click', () => {
        if (teamsData.length === 0) {
            alert('No teams to export!');
            return;
        }
        exportToCSV(teamsData);
    });

    const exportToCSV = (teams) => {
        // Helper to handle commas and quotes in data
        const escapeCsvCell = (cell) => {
            if (cell == null) return '';
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
        };

        const maxMembers = Math.max(0, ...teams.map(team => team.members.length));
        
        let headers = ['Team Name', 'Team Leader Name', 'Team Leader Phone', 'Status', 'Registration Date'];
        for (let i = 1; i <= maxMembers; i++) {
            headers.push(`Member ${i} Name`, `Member ${i} SAP ID`, `Member ${i} School`, `Member ${i} Course`, `Member ${i} Year`, `Member ${i} Email`, `Member ${i} Phone`);
        }

        const rows = teams.map(team => {
            const row = [
                escapeCsvCell(team.teamName),
                escapeCsvCell(team.teamLeaderName),
                escapeCsvCell(team.teamLeaderPhone),
                escapeCsvCell(team.status),
                escapeCsvCell(new Date(team.registrationDate).toLocaleString())
            ];
            
            for (let i = 0; i < maxMembers; i++) {
                const member = team.members[i];
                if (member) {
                    row.push(escapeCsvCell(member.name), escapeCsvCell(member.sapId), escapeCsvCell(member.school), escapeCsvCell(member.course), escapeCsvCell(member.year), escapeCsvCell(member.email), escapeCsvCell(member.phone));
                } else {
                    row.push('', '', '', '', '', '', ''); // Fill empty cells
                }
            }
            return row.join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'registered-teams.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Initial Load ---
    loadInitialData();
});