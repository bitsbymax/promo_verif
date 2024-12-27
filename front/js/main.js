(function () {
	//TODO
	//? prefill input with number if user is logged in
	//? add phone number mask
	//? disable submit if phone is not valid

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
			console.log('getUser', res);
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
			console.log('verifyUserPhone', res);
			return res;
		} catch (error) {
			console.error('Error verifying user phone:', error);
			throw error;
		}
	};

	const changeUserPhone = async () => {
		try {
			const res = await window.FE.socket_send({
				cmd: 'accounting/change_user',
				body: `phone=%2B${phone}&user_id=${userid}`,
			});
			console.log('changeUserPhone', res);
			return res;
		} catch (error) {
			console.error('Error changing user phone:', error);
			throw error;
		}
	};

	const confirmUserPhone = async () => {
		try {
			await window.FE.socket_send({
				cmd: 'accounting/user_phone_confirm',
				data: {
					confirm_code: `${confirm_code}`,
					session_id: '${session_id}',
				},
			});
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

		const verificationForm = document.getElementById('verification_form');
		const phoneInput = document.getElementById('username');
		const loginButton = document.getElementById('login-button');
		const submitButton = verificationForm.getElementById('submit-button');

		if (window.FE?.user.role === 'guest') {
			loginButton.style.display = 'block';
			verificationForm.style.display = 'none';

			return;
		}

		const user = await getUser();
		verificationForm.style.display = 'block';

		if (user.data.account.phone_number && user.data.account.account_status.IS_PHONE_VERIFIED) {
			const phoneVerifiedMsg = document.createElement('span');
			phoneVerifiedMsg.textContent = 'Ваш номер телефону підтверджено';
			phoneVerifiedMsg.classList.add('verified-msg');
			verificationForm.after(phoneVerifiedMsg);

			return;
		}

		// Input handling
		let typingTimer;
		const doneTypingInterval = 500; // ms

		phoneInput.addEventListener('input', () => {
			clearTimeout(typingTimer);
			submitButton.textContent = 'Змінити номер';

			// Disable button while typing
			submitButton.disabled = true;

			typingTimer = setTimeout(async () => {
				const phone = phoneInput.value.trim();

				if (phone.length >= 10) {
					// Basic validation
					submitButton.disabled = false;
					try {
						await changeUserPhone(phone, user.id);
					} catch (error) {
						// Handle error (maybe show error message to user)
						submitButton.disabled = true;
					}
				} else {
					submitButton.disabled = true;
				}
			}, doneTypingInterval);
		});

		verificationForm.addEventListener('submit', async (e) => {
			e.preventDefault();
			console.log('form submitted');

			submitButton.disabled = true;

			const phone = phoneInput.value.trim();
			const verificationRecord = new FormData();
			verificationRecord.append('phone', phone);
			verificationRecord.append('userid', user.id);

			try {
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

	document.addEventListener('DOMContentLoaded', async () => {
		init();
	});
})();
