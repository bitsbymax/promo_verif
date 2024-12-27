(function () {
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
			console.log(res);
			return res;
		} catch (error) {
			console.error('Error fetching user:', error);
			throw error;
		}
	};

	const verifyUserPhone = async () => {
		try {
			await window.FE.socket_send({
				cmd: 'accounting/user_phone_verify',
				data: {
					phone: { phone },
				},
			});
		} catch (error) {
			console.error('Error verifying user phone:', error);
			throw error;
		}
	};

	const changeUserPhone = async () => {
		try {
			await window.FE.socket_send({
				cmd: 'accounting/change_user',
				body: `phone=%2B${phone}&user_id=${userid}`,
			});
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

		if (window.FE && window.FE.user.role === 'guest') {
			const loginButton = document.getElementById('login-button');
			loginButton.style.display = 'block';
			verificationForm.style.display = 'none';
		} else {
			const user = await getUser();
            verificationForm.style.display = 'block';
            
            const phoneVerified = user.data.account.phone_number && user.data.account.account_status.IS_PHONE_VERIFIED;

            if (phoneVerified) {
                //! add notification to the input field

                return;
            }

			verificationForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('form submitted')

				const formData = {
					phone: phoneInput.value.trim(),
				};

				try {
					// First verify the phone
					await verifyUserPhone(formData.phone);
					
                    //? Verification locked?
                    // true - wait timer refresh --> message.reason, message.rest_time
                    // false - wait form confirmation code and then confirmUserPhone()

                    //! Edit button path
                    //! Refresh button path
                    //! Try click send code again path

					// Add verification record
					const verificationRecord = new FormData();
					verificationRecord.append('phone', formData.phone);
					verificationRecord.append('userid', user.id);
					await addVerification(verificationRecord);
				} catch (error) {
					console.error('Verification process failed:', error);
				}
			});
		}
	}

	init();
})();
