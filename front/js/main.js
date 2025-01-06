(function () {
    //TODO
    //! add phone number mask and phone validation

    const API = 'https://www.favbet.ua';
    const VERIFICATION_API = 'http://localhost:3181/verification-api';
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

    const changeUserPhone = async (userData) => {
        try {
            const response = await fetch(`${API}/accounting/api/change_user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userData,
                }),
            });
            const data = await response.json();
            console.log('changeUserPhone response:', data);
            return data;
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
            const response = await fetch(`${VERIFICATION_API}/verifications`, {
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
            const response = await fetch(`${VERIFICATION_API}/verification`, {
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

    const init = async () => {
        console.log('%c init fired', 'color: #00ff00; font-weight: bold');

        if (window.FE?.user.role === 'guest') {
            verificationForm.style.display = 'none';
            loginButton.classList.add('visible');

            return;
        } else {
            loginButton.style.display = 'none';
            verificationForm.classList.add('visible');
        }

        try {
            const user = await getUser();

            const userPhoneNumber = user.data.account.phone_number;
            console.log('userPhoneNumber:', userPhoneNumber);
            const userPhoneVerified = user.data.account.account_status.find(
                (status) => status.alias === 'IS_PHONE_VERIFIED'
            ).value;
            console.log('userPhoneVerified:', userPhoneVerified);

            verificationForm.style.display = 'block';
            phoneInput.value = userPhoneNumber;

            // Check if user has a number and is already verified
            if (userPhoneNumber && userPhoneVerified) {
                phoneInput.disabled = true;
                submitButton.style.display = 'none';
                const message = 'Ваш номер телефону підтверджено';
                showInputMessage(message);

                return;
            }

            showInputMessage('Будь ласка, підтвердіть Ваш номер телефону');
        } catch (error) {
            console.error('Failed to get user:', error);
        }

        // User submits verification form
        verificationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log(
                '%c Form submitted',
                'color: #ff00ff; font-weight: bold',
                e
            );

            submitButton.disabled = true;
            const phone = phoneInput.value.trim();
            console.log('phone:', phone);

            if (!isPhoneValid(phone)) {
                const message = 'Введіть коректний номер телефону';
                showInputMessage(message);
                submitButton.disabled = false;

                return;
            }

            try {
                const phoneWithoutPlus = phone.slice(1);
                const userId = user.id;
                const userData = new FormData();
                userData.append('phoneWithoutPlus', phoneWithoutPlus);
                userData.append('userid', userId);

                if (phoneWithoutPlus !== userPhoneNumber) {
                    await changeUserPhone(userData);
                }

                //First verify the phone
                const result = await verifyUserPhone(phoneWithoutPlus);

                //? Verification locked?
                // true - wait timer refresh --> message.reason, message.rest_time
                // false - wait form confirmation code and then confirmUserPhone()

                //! Edit button path
                //! Refresh button path
                //! Try click send code again path

                // Add verification record
                // const verificationRecord = new FormData();

                // verificationRecord.append('phoneWithoutPlus', phone);
                // verificationRecord.append('userid', userId);
                // await addVerification(verificationRecord);

                // Change button text after successful verification
                submitButton.textContent = 'Підтвердити';
            } catch (error) {
                console.error('Verification process failed:', error);
            } finally {
                submitButton.disabled = false;
            }
        });
    };

    init();
})();
