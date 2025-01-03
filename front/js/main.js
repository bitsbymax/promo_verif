(function () {
	//TODO
	//! add phone number mask and phone validation

	const API_URL = 'http://localhost:3181/verification-api';

	const phoneInput = document.getElementById('phone');
	const verificationForm = document.getElementById('verification_form');
	const loginButton = document.getElementById('login-button');
	const submitButton = document.getElementById('submit-button');

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
					phone,
				},
			});
			console.log('verifyUserPhone response', res);
			return res;
		} catch (error) {
			console.error('Error verifying user phone:', error);
			throw error;
		}
	};

	// const changeUserPhone = async (phone, userId) => {
	// 	try {
	// 		const res = await window.FE.socket_send({
	// 			cmd: 'accounting/change_user',
	// 			body: `phone=%2B${phone}&user_id=${userId}`,
	// 		});
	// 		console.log('changeUserPhone response', res);
	// 		return res;
	// 	} catch (error) {
	// 		console.error('Error changing user phone:', error);
	// 		throw error;
	// 	}
	// };

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

	const showInputMessage = (message) => {
		// Remove any existing messages first
		const existingMessages = document.querySelectorAll('.input-msg');
		existingMessages.forEach((msg) => msg.remove());

		const successMessage = document.createElement('span');
		successMessage.textContent = message;
		successMessage.classList.add('input-msg');
		verificationForm.after(successMessage);
	};

	const isPhoneValid = (phone) => {
		const phoneRegex = /^\+380\d{9}$/;
		return phoneRegex.test(phone);
	};

	async function init() {
		console.log('init');

		if (window.FE?.user.role === 'guest') {
			loginButton.style.display = 'block';
			verificationForm.style.display = 'none';

			return;
		}

		const user = await getUser();
		console.log(user.data.account.account_status);

		const userPhoneNumber = user.data.account.phone_number;
		const userPhoneVerified = user.data.account.account_status.find(
			(status) => status.status === 'IS_PHONE_VERIFIED'
		).value;

		verificationForm.style.display = 'block';
		phoneInput.value = userPhoneNumber;

		// Check if user is already verified
		if (userPhoneNumber && userPhoneVerified) {
			phoneInput.disabled = true;
			submitButton.style.display = 'none';
			const message = 'Ваш номер телефону підтверджено';
			showInputMessage(message);

			return;
		} else {
			const message = 'Будь ласка, підтвердіть Ваш номер телефону';
			showInputMessage(message);
		}

		// User submits verification form with his phone
		verificationForm.addEventListener('submit', async (e) => {
			e.preventDefault();
			console.log(e, 'form submitted');

			submitButton.disabled = true;

			if (!isPhoneValid(phoneInput.value.trim())) {
				const message = 'Введіть коректний номер телефону';
				showInputMessage(message);
				submitButton.disabled = false;
				return;
			}

			const phone = phoneInput.value.trim().slice(1);
			// const userId = user.id;
			// const verificationRecord = new FormData();
			// verificationRecord.append('phone', phone);
			// verificationRecord.append('userid', userId);

			try {
				// First verify the phone
				const result = await verifyUserPhone(phone);

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

	init();
})();
