document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('adminToken');

    if (!token) {
        window.location.href = '/admin-login.html';
        return;
    }

    document.addEventListener('headerLoaded', () => {
        const logoutButton = document.getElementById('logout-button');
        const siteTitle = document.querySelector('.site-title');

        if (logoutButton) {
            logoutButton.style.display = 'block';
            logoutButton.addEventListener('click', () => {
                localStorage.removeItem('adminToken');
                window.location.href = '/admin-login.html';
            });
        }
        
        if (siteTitle) {
            siteTitle.textContent = 'Admin Dashboard';
        }
    });

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const teamsTbody = document.getElementById('teams-tbody');
    const settingsForm = document.getElementById('settings-form');
    const paymentToggle = document.getElementById('paymentRequired');
    const registrationsToggle = document.getElementById('registrationsOpen');
    const exportButton = document.getElementById('export-csv-button');
    const modalOverlay = document.getElementById('details-modal-overlay');
    const modalTeamName = document.getElementById('modal-team-name');
    const modalTeamDetails = document.getElementById('modal-team-details');
    const modalCloseButton = document.querySelector('.close-button');
    
    let teamsData = [];
    
    const loadTeams = async () => {
        try {
            const response = await fetch('/api/admin/teams', { headers });

            if (response.status === 401 || response.status === 403) {
                 localStorage.removeItem('adminToken');
                 window.location.href = '/admin-login.html';
                 return;
            }
            const teams = await response.json();
            teamsData = teams;

            teamsTbody.innerHTML = '';
            teams.forEach(team => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${team.teamName}</td>
                    <td>${team.teamLeaderName}</td>
                    <td>${team.teamLeaderPhone}</td>
                    <td><span class="status-badge status-${team.status}">${team.status}</span></td>
                    <td>
                        <div class="action-buttons" style="flex-direction: row; gap: 10px;">
                            <button class="button-red view-btn" data-id="${team._id}" style="background-color: #17a2b8; width: auto; padding: 8px 12px; font-size: 14px;">View</button>
                            ${team.status === 'waitlisted' ? 
                                `<button class="button-red approve-btn" data-id="${team._id}" style="width: auto; padding: 8px 12px; font-size: 14px;">Approve</button>` : 
                                '<span></span>'}
                            <button class="button-red delete-btn" data-id="${team._id}" style="background-color: #dc3545; width: auto; padding: 8px 12px; font-size: 14px;">Delete</button>
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
            document.getElementById('paymentAmount').value = settings.paymentAmount || 99;
            document.getElementById('upiId').value = settings.upiId || '';
            paymentToggle.checked = settings.paymentRequired !== false;
            registrationsToggle.checked = settings.registrationsOpen !== false;
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };
    
    const openDetailsModal = (teamId) => {
        const team = teamsData.find(t => t._id === teamId);
        if (!team) return;

        modalTeamName.textContent = team.teamName;
        
        let transactionHtml = '';
        if (team.transactionId) {
            transactionHtml = `<h3>Transaction ID</h3><p>${team.transactionId}</p>`;
        }

        let screenshotHtml = '';
        if (team.paymentScreenshotUrl) {
            screenshotHtml = `
                <h3>Payment Screenshot</h3>
                <a href="${team.paymentScreenshotUrl}" target="_blank" rel="noopener noreferrer">
                    <img src="${team.paymentScreenshotUrl}?tr=w-400" alt="Payment Screenshot" style="max-width: 100%; border-radius: 8px;" />
                </a>
                <br/>
                <a href="${team.paymentScreenshotUrl}" download target="_blank" class="button-red" style="display: inline-block; margin-top: 10px; width: auto; padding: 8px 16px;">Download</a>
            `;
        } else {
            screenshotHtml = `<h3>Payment Screenshot</h3><p>No screenshot was uploaded.</p>`;
        }

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
        
        modalTeamDetails.innerHTML = transactionHtml + screenshotHtml + membersHtml;
        modalOverlay.classList.add('active');
    };

    const loadInitialData = () => {
        loadTeams();
        loadSettings();
    };
    
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const settingsData = {
            maxTeams: document.getElementById('maxTeams').value,
            membersPerTeam: document.getElementById('membersPerTeam').value,
            paymentAmount: document.getElementById('paymentAmount').value,
            upiId: document.getElementById('upiId').value,
            paymentRequired: paymentToggle.checked,
            registrationsOpen: registrationsToggle.checked
        };
        
        try {
            await fetch('/api/admin/settings', {
                method: 'PUT',
                headers,
                body: JSON.stringify(settingsData)
            });
            alert('Settings saved successfully!');
        } catch (error) {
            alert('Failed to save settings.');
            console.error('Error saving settings:', error);
        }
    });

    teamsTbody.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const teamId = target.dataset.id;

        if (target.classList.contains('approve-btn')) {
            await fetch(`/api/admin/teams/${teamId}/approve`, { method: 'PUT', headers });
            loadTeams();
        } else if (target.classList.contains('view-btn')) {
            openDetailsModal(teamId);
        } else if (target.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
                await fetch(`/api/admin/teams/${teamId}`, { method: 'DELETE', headers });
                loadTeams(); 
            }
        }
    });
    
    modalCloseButton.addEventListener('click', () => modalOverlay.classList.remove('active'));
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.classList.remove('active');
        }
    });

    exportButton.addEventListener('click', () => {
        if (teamsData.length === 0) {
            alert('No teams to export!');
            return;
        }
        exportToCSV(teamsData);
    });

    const exportToCSV = (teams) => {
        const escapeCsvCell = (cell) => {
            if (cell == null) return '';
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
        };

        const maxMembers = Math.max(0, ...teams.map(team => team.members.length));
        
        let headers = ['Team Name', 'Team Leader Name', 'Team Leader Phone', 'Status', 'Transaction ID', 'Screenshot URL', 'Registration Date'];
        for (let i = 1; i <= maxMembers; i++) {
            headers.push(`Member ${i} Name`, `Member ${i} SAP ID`, `Member ${i} School`, `Member ${i} Course`, `Member ${i} Year`, `Member ${i} Email`, `Member ${i} Phone`);
        }

        const rows = teams.map(team => {
            const row = [
                escapeCsvCell(team.teamName),
                escapeCsvCell(team.teamLeaderName),
                escapeCsvCell(team.teamLeaderPhone),
                escapeCsvCell(team.status),
                escapeCsvCell(team.transactionId),
                escapeCsvCell(team.paymentScreenshotUrl),
                escapeCsvCell(new Date(team.registrationDate).toLocaleString())
            ];
            
            for (let i = 0; i < maxMembers; i++) {
                const member = team.members[i];
                if (member) {
                    row.push(escapeCsvCell(member.name), escapeCsvCell(member.sapId), escapeCsvCell(member.school), escapeCsvCell(member.course), escapeCsvCell(member.year), escapeCsvCell(member.email), escapeCsvCell(member.phone));
                } else {
                    row.push('', '', '', '', '', '', '');
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

    loadInitialData();
});