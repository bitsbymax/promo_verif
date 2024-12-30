(function () {
	//TODO
	//! prefill input with number if user is logged in
	//! add phone number mask
	//! disable submit if phone is not valid
	//! phone validation

	const API_URL = 'http://localhost:3181/verification-api';

	// const resultsTable = document.querySelector('.tableResults__body'),
	// 	unauthMsgs = document.querySelectorAll('.unauth-msg'),
	// 	youAreInBtns = document.querySelectorAll('.took-part');

	// #region Translation
	// const ukLeng = document.querySelector('#ukLeng');
	// const enLeng = document.querySelector('#enLeng');

	// let locale = 'en';

	// if (ukLeng) locale = 'uk';
	// if (enLeng) locale = 'en';

	// let i18nData = {};
	// let userId;

	// function loadTranslations() {
	// 	return fetch(`${apiURL}/translates/${locale}`)
	// 		.then((res) => res.json())
	// 		.then((json) => {
	// 			i18nData = json;
	// 			translate();

	// 			var mutationObserver = new MutationObserver(function (mutations) {
	// 				translate();
	// 			});
	// 			mutationObserver.observe(document.getElementById('predictor'), {
	// 				childList: true,
	// 				subtree: true,
	// 			});
	// 		});
	// }

	// function translate() {
	// 	const elems = document.querySelectorAll('[data-translate]');
	// 	if (elems && elems.length) {
	// 		elems.forEach((elem) => {
	// 			const key = elem.getAttribute('data-translate');
	// 			elem.innerHTML = translateKey(key);
	// 			elem.removeAttribute('data-translate');
	// 		});
	// 	}

	// 	if (locale === 'en') {
	// 		mainPage.classList.add('en');
	// 	}

	// 	refreshLocalizedClass();
	// }

	// function translateKey(key) {
	// 	if (!key) {
	// 		return;
	// 	}
	// 	return i18nData[key] || '*----NEED TO BE TRANSLATED----*   key:  ' + key;
	// }

	// function refreshLocalizedClass(element, baseCssClass) {
	// 	if (!element) {
	// 		return;
	// 	}
	// 	for (const lang of ['uk', 'en']) {
	// 		element.classList.remove(baseCssClass + lang);
	// 	}
	// 	element.classList.add(baseCssClass + locale);
	// }

	// #endregion

	const getUser = async () => {
		try {
			const res = await window.FE.socket_send({
				cmd: 'get_user',
			});
			console.log('getUser response', res);
			return res;
		} catch (error) {
			console.error('Error fetching user:', error);
			throw error;
		}
	};

	const verifyUserPhone = async (phone) => {
		try {
			const res = await window.FE.socket_send({
				cmd: 'accounting/user_phone_verify',
				data: {
					phone: { phone },
				},
			});
			console.log('verifyUserPhone response', res);
			return res;
		} catch (error) {
			console.error('Error verifying user phone:', error);
			throw error;
		}
	};

	const changeUserPhone = async (phone, userId) => {
		try {
			const res = await window.FE.socket_send({
				cmd: 'accounting/change_user',
				body: `phone=%2B${phone}&user_id=${userId}`,
			});
			console.log('changeUserPhone response', res);
			return res;
		} catch (error) {
			console.error('Error changing user phone:', error);
			throw error;
		}
	};

	const confirmUserPhone = async (confirmCode, sessionId) => {
		try {
			const res = await window.FE.socket_send({
				cmd: 'accounting/user_phone_confirm',
				data: {
					confirm_code: `${confirmCode}`,
					session_id: `${sessionId}`,
				},
            });
            
            console.log('confirmUserPhone response', res);
            return res;
		} catch (error) {
			console.error('Error confirming user phone:', error);
			throw error;
		}
	};

	const getAllVerifications = async () => {
		try {
			const response = await fetch(`${API_URL}/verifications`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			});
			return await response.json();
		} catch (error) {
			console.error('Error fetching verifications:', error);
			throw error;
		}
	};

	const addVerification = async (formData) => {
		try {
			const response = await fetch(`${API_URL}/verification`, {
				method: 'POST',
				body: formData,
			});
			return await response.json();
		} catch (error) {
			console.error('Error adding verification:', error);
			throw error;
		}
	};

	async function init() {
		console.log('init');
		const phoneInput = document.getElementById('phone');
		const verificationForm = document.getElementById('verification_form');
		const loginButton = document.getElementById('login-button');
		const submitButton = document.getElementById('submit-button');

		if (window.FE?.user.role === 'guest') {
			loginButton.style.display = 'block';
			verificationForm.style.display = 'none';

			return;
		}

        const user = await getUser();
        let phoneEditing = false;
		verificationForm.style.display = 'block';
		phoneInput.value = user.data.account.phone_number;

		// Check if user is already verified
		if (user.data.account.phone_number && user.data.account.account_status.IS_PHONE_VERIFIED) {
			const phoneVerifiedMsg = document.createElement('span');
			phoneVerifiedMsg.textContent = 'Ваш номер телефону підтверджено';
			phoneVerifiedMsg.classList.add('verified-msg');
			verificationForm.after(phoneVerifiedMsg);

			return;
		}

		phoneInput.addEventListener('input', (e) => {
			e.preventDefault();
            phoneEditing = true;
			submitButton.textContent = 'Зберегти';
			const phone = phoneInput.value.trim();
			// Enable/disable button based on phone length
			submitButton.disabled = phone.length < 10; //?
		});

		verificationForm.addEventListener('submit', async (e) => {
			e.preventDefault();
			console.log('form submitted');

			submitButton.disabled = true;

            const phone = phoneInput.value.trim().slice(1); //? do we need to trim +?
            const userId = user.id;
			const verificationRecord = new FormData();
			verificationRecord.append('phone', phone);
			verificationRecord.append('userid', userId);

            try {
                if (phoneEditing) {
                    const result = await changeUserPhone(phone, userId);
                    //? Check response and call addVerification
                }
				// First verify the phone
				await verifyUserPhone(phone);

				//? Verification locked?
				// true - wait timer refresh --> message.reason, message.rest_time
				// false - wait form confirmation code and then confirmUserPhone()

				//! Edit button path
				//! Refresh button path
				//! Try click send code again path

				// Add verification record
				// await addVerification(verificationRecord);

				// Change button text after successful verification
				submitButton.textContent = 'Підтвердити';
			} catch (error) {
				console.error('Verification process failed:', error);
			}
		});
	}

	document.addEventListener('DOMContentLoaded', () => {
		init();
	});
})();
