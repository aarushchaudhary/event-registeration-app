document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registration-form');
    const errorMessageEl = document.getElementById('error-message');
    const memberFormsContainer = document.getElementById('member-forms-container');
    const memberTemplate = document.getElementById('member-form-template');

    // --- Data for our dynamic dropdowns ---
    const schoolData = {
        'STME': {
            courses: ['CSE-DS', 'CE'],
            years: ['1st', '2nd', '3rd', '4th']
        },
        'SPTM': {
            courses: ['PharmaTech'],
            years: ['1st', '2nd', '3rd', '4th', '5th']
        },
        'SOL': {
            courses: ['BBA LLB', 'BA LLB'],
            years: ['1st', '2nd', '3rd', '4th', '5th']
        },
        'SOC': {
            courses: ['BBA'],
            years: ['1st', '2nd', '3rd']
        },
        'SBM': {
            courses: ['MBA'],
            years: ['1st', '2nd']
        }
    };

    const generateMemberForms = (teamSize) => {
        memberFormsContainer.innerHTML = ''; 
        for (let i = 1; i <= teamSize; i++) {
            const formClone = memberTemplate.content.cloneNode(true);
            
            const title = formClone.querySelector('.member-title');
            title.textContent = `Member ${i} Details`;

            // Add event listener to the new school dropdown
            const schoolSelect = formClone.querySelector('.school-select');
            schoolSelect.addEventListener('change', (event) => {
                const selectedSchool = event.target.value;
                const memberSection = event.target.closest('.member-section');
                populateDropdowns(selectedSchool, memberSection);
            });
            
            memberFormsContainer.appendChild(formClone);
        }
    };

    // Function to populate Course and Year dropdowns
    const populateDropdowns = (school, memberSection) => {
        const dynamicFieldsContainer = memberSection.querySelector('.dynamic-fields-container');
        const courseSelect = memberSection.querySelector('.course-select');
        const yearSelect = memberSection.querySelector('.year-select');

        // Clear previous options
        courseSelect.innerHTML = '<option value="">-- Select a Course --</option>';
        yearSelect.innerHTML = '<option value="">-- Select a Year --</option>';

        if (school && schoolData[school]) {
            // A school is selected, so populate fields and show them
            const data = schoolData[school];
            data.courses.forEach(course => {
                courseSelect.innerHTML += `<option value="${course}">${course}</option>`;
            });
            data.years.forEach(year => {
                yearSelect.innerHTML += `<option value="${year}">${year}</option>`;
            });
            dynamicFieldsContainer.style.display = 'flex'; // Show the dropdowns
        } else {
            // No school is selected, so hide the fields
            dynamicFieldsContainer.style.display = 'none';
        }
    };

    const initializeForm = async () => {
        try {
            const response = await fetch('/api/stats');
            const data = await response.json();
            const teamSize = data.membersPerTeam || 3; 
            generateMemberForms(teamSize);
        } catch (error) {
            console.error('Failed to load team settings, defaulting to 3 members.', error);
            generateMemberForms(3);
        }
    };

    // The form submission logic
    form.addEventListener('submit', async (event) => {
        event.preventDefault(); 
        errorMessageEl.textContent = '';

        const formData = new FormData(form);
        const teamData = {
            teamName: formData.get('teamName'),
            teamLeaderName: formData.get('teamLeaderName'),
            teamLeaderPhone: formData.get('teamLeaderPhone'),
            members: []
        };

        const memberSections = document.querySelectorAll('.member-section');
        memberSections.forEach(section => {
            const member = {
                name: section.querySelector('input[name="name"]').value,
                sapId: section.querySelector('input[name="sapId"]').value,
                school: section.querySelector('select[name="school"]').value,
                course: section.querySelector('select[name="course"]').value,
                year: section.querySelector('select[name="year"]').value,
                email: section.querySelector('input[name="email"]').value,
                phone: section.querySelector('input[name="phone"]').value,
            };
            teamData.members.push(member);
        });

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(teamData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Registration failed. The team name may already exist.');
            }

            document.getElementById('registration-view').style.display = 'none';
            document.getElementById('success-view').style.display = 'block';

        } catch (error) {
            errorMessageEl.textContent = error.message;
        }
    });
    
    initializeForm();
});