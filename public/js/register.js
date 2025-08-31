document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registration-form');
    const errorMessageEl = document.getElementById('error-message');
    const memberFormsContainer = document.getElementById('member-forms-container');
    const memberTemplate = document.getElementById('member-form-template');
    const paymentSection = document.querySelector('.payment-info');
    const transactionIdGroup = document.querySelector('input[name="transactionId"]').closest('.form-group');
    const transactionIdInput = document.querySelector('input[name="transactionId"]');
    const paymentAmountEl = document.getElementById('payment-amount'); // <-- NEW
    const upiIdEl = document.getElementById('upi-id'); // <-- NEW

    // --- Data for our dynamic dropdowns ---
    const schoolData = {
        'STME': {
            courses: ['B.Tech Computer Engineering', 'B. Tech. Computer Science and Engineering (Data Science)'],
            years: ['1st', '2nd', '3rd', '4th']
        },
        'SPTM': {
            courses: ['B.Pharm + MBA (Pharma Tech)'],
            years: ['1st', '2nd', '3rd', '4th', '5th']
        },
        'SOL': {
            courses: ['B.A., LL.B. (Hons.)', 'B.B.A., LL.B. (Hons.)'],
            years: ['1st', '2nd', '3rd', '4th', '5th']
        },
        'SOC': {
            courses: ['B.B.A. (Bachelors In Business Administration)'],
            years: ['1st', '2nd', '3rd', '4th']
        },
        'SBM': {
            courses: ['MBA (Master of Business Administration)'],
            years: ['1st', '2nd']
        }
    };

    const generateMemberForms = (teamSize) => {
        memberFormsContainer.innerHTML = ''; 
        for (let i = 1; i <= teamSize; i++) {
            const formClone = memberTemplate.content.cloneNode(true);
            
            const title = formClone.querySelector('.member-title');
            if (title) { // Check if title exists to avoid errors
                title.textContent = `Member ${i} Details`;
            }

            const schoolSelect = formClone.querySelector('.school-select');
            if (schoolSelect) { // Check if schoolSelect exists
                schoolSelect.addEventListener('change', (event) => {
                    const selectedSchool = event.target.value;
                    const memberSection = event.target.closest('.member-section');
                    populateDropdowns(selectedSchool, memberSection);
                });
            }
            
            memberFormsContainer.appendChild(formClone);
        }
    };

    const populateDropdowns = (school, memberSection) => {
        if (!memberSection) return; // Exit if the section doesn't exist
        const dynamicFieldsContainer = memberSection.querySelector('.dynamic-fields-container');
        const courseSelect = memberSection.querySelector('.course-select');
        const yearSelect = memberSection.querySelector('.year-select');

        if (!dynamicFieldsContainer || !courseSelect || !yearSelect) return;

        courseSelect.innerHTML = '<option value="">-- Select a Course --</option>';
        yearSelect.innerHTML = '<option value="">-- Select a Year --</option>';

        if (school && schoolData[school]) {
            const data = schoolData[school];
            data.courses.forEach(course => {
                courseSelect.innerHTML += `<option value="${course}">${course}</option>`;
            });
            data.years.forEach(year => {
                yearSelect.innerHTML += `<option value="${year}">${year}</option>`;
            });
            dynamicFieldsContainer.style.display = 'flex';
        } else {
            dynamicFieldsContainer.style.display = 'none';
        }
    };

    const initializeForm = async () => {
        try {
            const response = await fetch('/api/stats');
            const data = await response.json();
            const teamSize = data.membersPerTeam || 0; 
            if (teamSize > 0 && memberTemplate.content.children.length > 0) {
                 generateMemberForms(teamSize);
            }

            // --- UPDATED: Set payment details and show/hide section ---
            paymentAmountEl.textContent = data.paymentAmount;
            upiIdEl.textContent = data.upiId;

            if (data.paymentRequired) {
                paymentSection.style.display = 'block';
                transactionIdGroup.style.display = 'block';
                transactionIdInput.required = true;
            } else {
                paymentSection.style.display = 'none';
                transactionIdGroup.style.display = 'none';
                transactionIdInput.required = false;
            }

        } catch (error) {
            console.error('Failed to load team settings.', error);
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
            transactionId: formData.get('transactionId'),
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
                throw new Error(errorData.message || 'Registration failed. The team name or transaction ID might already be taken.');
            }

            document.getElementById('registration-view').style.display = 'none';
            document.getElementById('success-view').style.display = 'block';

        } catch (error) {
            errorMessageEl.textContent = error.message;
        }
    });
    
    initializeForm();
});