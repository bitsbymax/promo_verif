/*
    Success response from api inside changeUserPhone function
{
  "error": "no",
  "error_code": "",
  "response": "accounting_success_15",
  "user_id": 100300268,
  "phone": "380675669466"
} 
  
*/

/* 
    Success response from api inside verifyUserPhone function
{
  "cid": "2118c8c6-f7dc-4d63-9fe9-78d71fcdbc9b",
  "data": {
    "code_confirm_attempt_ttl": 86400,
    "confirm_code_length": 5,
    "daily_attempts_count": 3,
    "daily_attempts_count_rest": 2,
    "phone_verification_ttl": 300,
    "session_id": "c298cefa-52ec-4c04-8ab2-65866ffc3afd",
    "user_id": 100300268
  },
  "ok": true
}
*/

/* Unsuccess response from api inside verifyUserPhone function
{
    code: -24
    message: {
        reason: 'verification_locked',
        rest_time: %some number%
    }
}
*/

(function () {
    //TODO
    //! add phone number mask and phone validation

    const API = 'https://www.favbet.ua';
    // const VERIFICATION_API = 'http://localhost:3181/verification-api';
    const phoneInput = document.getElementById('phone');
    const verificationForm = document.getElementById('verification__form');
    const linkButtonWrapper = document.querySelector('.link__button-wrapper');
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

    const verifyUserPhone = async (cid) => {
        try {
            const res = await window.FE.socket_send({
                cmd: 'accounting/user_phone_verify',
                cid,
            });
            console.log('verifyUserPhone response', res);
            return res;
        } catch (error) {
            console.error('Error verifying user phone:', error);

            return error;
        }
    };

    const changeUserPhone = async (userData) => {
        try {
            const response = await fetch(`${API}/accounting/api/change_user`, {
                method: 'POST',
                body: userData,
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

    // const getAllVerifications = async () => {
    //     try {
    //         const response = await fetch(`${VERIFICATION_API}/verifications`, {
    //             method: 'GET',
    //             headers: {
    //                 'Content-Type': 'application/json',
    //             },
    //         });
    //         return await response.json();
    //     } catch (error) {
    //         console.error('Error fetching verifications:', error);
    //         throw error;
    //     }
    // };

    // const addVerification = async (formData) => {
    //     try {
    //         const response = await fetch(`${VERIFICATION_API}/verification`, {
    //             method: 'POST',
    //             body: formData,
    //         });
    //         return await response.json();
    //     } catch (error) {
    //         console.error('Error adding verification:', error);
    //         throw error;
    //     }
    // };

    const showInputMessage = (message, targetElement, state = false) => {
        // Remove any existing messages first
        const existingMessages = document.querySelectorAll('.input-msg:not([data-code-error])');
        existingMessages.forEach((msg) => msg.remove());

        const messageElement = document.createElement('div');
        messageElement.classList.add('input-msg');

        if (Array.isArray(message) && message.length === 2) {
            const timerWrapper = document.createElement('div');
            timerWrapper.classList.add('timerWrapper');
            timerWrapper.style.minWidth = state ? '65px' : '45px';

            const firstSpan = document.createElement('span');
            firstSpan.textContent = message[0];
            firstSpan.classList.add('timer');

            timerWrapper.appendChild(firstSpan);

            const secondSpan = document.createElement('span');
            secondSpan.textContent = message[1];
            if (state) {
                secondSpan.classList.add('error');
            } else {
                secondSpan.classList.add('warning');
            }

            messageElement.appendChild(timerWrapper);
            // Add a space between spans
            messageElement.appendChild(document.createTextNode(' '));
            messageElement.appendChild(secondSpan);
        } else {
            messageElement.textContent = message;
        }

        if (state) {
            messageElement.classList.add('error');
        } else {
            messageElement.classList.add('warning');
        }

        const inputElement = targetElement.querySelector('input');
        const buttonElement = targetElement.querySelector('button');

        // Find the first error message if it exists
        const existingErrorMsg =
            targetElement.querySelector('[data-code-error]');

        if (existingErrorMsg) {
            // Insert after the existing error message
            existingErrorMsg.parentNode.insertBefore(
                messageElement,
                existingErrorMsg.nextSibling
            );
        } else {
            // Insert before the button as before
            inputElement.parentNode.insertBefore(messageElement, buttonElement);
        }
    };

    const isPhoneValid = (phone) => {
        const phoneRegex = /^380\d{9}$/;
        return phoneRegex.test(phone);
    };

    const init = async () => {
        console.log('%c init fired', 'color: #00ff00; font-weight: bold');

        if (window.FE?.user.role === 'guest') {
            // verificationForm.style.display = 'none';
            linkButtonWrapper.style.display = 'flex';

            return;
        } else {
            verificationForm.classList.add('visible');
            verificationForm.classList.remove('hidden');
        }

        const confirmationForm = document.getElementById('confirmation__form');
        const confirmButton = document.getElementById('confirm-button');

        let verificationSession = null;
        let verificationTimer = null;
        let user = null;
        let cid = null;
        let userPhoneNumber = null;
        let userPhoneVerified = false;

        try {
            user = await getUser();
            cid = user.cid;
            userPhoneNumber = user.data.account.phone_number;
            console.log('userPhoneNumber:', userPhoneNumber);
            userPhoneVerified = user.data.account.account_status.find(
                (status) => status.alias === 'IS_PHONE_VERIFIED'
            ).value;
            console.log('userPhoneVerified:', userPhoneVerified);

            // Check if user has a number and is already verified
            if (userPhoneNumber && userPhoneVerified) {
                // Update header text and data-translate
                const header = document.querySelector('.form__header');
                header.classList.add('successBeforeHeader');
                header.textContent = 'ТИ ВЕРИФІКУВАВ НОМЕР ТЕЛЕФОНУ РАНІШЕ';
                header.setAttribute('data-translate', 'formHeaderBefore');

                // Update description text and data-translate
                const description =
                    document.querySelector('.form__description');
                description.textContent =
                    'Тепер ти не пропустиш головні події FAVBET';
                description.setAttribute(
                    'data-translate',
                    'formDescriptionBefore'
                );

                document.querySelector('.form__wrapper').style.display = 'none';

                const beforeImageWrapper = document.querySelector(
                    '.beforeImageWrapper'
                );
                beforeImageWrapper.classList.add('visible');
                beforeImageWrapper.classList.remove('hidden');
                const beforeImage = document.createElement('img');
                beforeImage.className = 'beforeImage';

                // Add container to form wrapper
                beforeImageWrapper.appendChild(beforeImage);

                linkButtonWrapper.style.display = 'flex';
                const linkButton = document.querySelector(
                    '.link__button-wrapper a'
                );
                linkButton.href = '/sports';
                linkButton.textContent = 'ДО ГРИ';
                linkButton.setAttribute('data-translate', 'confirmBefore');

                return;
            }

            verificationForm.classList.remove('hidden');
            verificationForm.classList.add('visible');
            phoneInput.value = `+${userPhoneNumber}`;
        } catch (error) {
            console.error('Failed to get user:', error);
        }

        const startVerificationTimer = (
            totalSeconds,
            { confirmation = false, verification = false }
        ) => {
            if (verificationTimer) {
                clearInterval(verificationTimer);
            }

            let timeLeft = totalSeconds;

            verificationTimer = setInterval(() => {
                if (timeLeft <= 0) {
                    clearInterval(verificationTimer);

                    confirmButton.disabled = false;
                    confirmButton.textContent = 'НАДІСЛАТИ ПОВТОРНО';
                    // Reset the form and remove required attribute
                    const codeInput =
                        document.getElementById('confirmation-code');
                    codeInput.value = '';
                    codeInput.required = false;
                    // Change form submit behavior to verification
                    confirmationForm.dataset.confirmationExpired = 'true';

                    //Show message about expired code
                    showInputMessage(
                        'Час верифікації минув',
                        confirmationForm,
                        'error'
                    );

                    return;
                }

                confirmButton.textContent = 'НАДІСЛАТИ';
                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;

                if (verification) {
                    showInputMessage(
                        [
                            `${Math.floor(timeLeft / 3600)
                                .toString()
                                .padStart(2, '0')}:${Math.floor(
                                (timeLeft % 3600) / 60
                            )
                                .toString()
                                .padStart(2, '0')}:${(timeLeft % 60)
                                .toString()
                                .padStart(2, '0')}`,
                            'верифікацію заблоковано. Дочекайтесь оновлення таймера',
                        ],
                        verificationForm,
                        'error'
                    );
                }

                if (confirmation) {
                    showInputMessage(
                        [
                            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
                            'час, який залишився, щоб ввести код з SMS-повідомлення. Після закінчення часу можна запросити код повторно',
                        ],
                        confirmationForm,
                        false,
                        true
                    );
                }
                timeLeft--;
            }, 1000);
        };

        const handleVerificationResponse = (response) => {
            console.log(
                'response from verifyUserPhone inside handleVerificationResponse',
                response
            );
            const step = {
                confirmation: false,
                verification: false,
            };
            if (response.ok) {
                verificationSession = response.data.session_id;
                // Only handle form visibility if it's hidden
                if (confirmationForm.classList.contains('hidden')) {
                    verificationForm.classList.add('hidden');
                    verificationForm.classList.remove('visible');
                    confirmationForm.classList.add('visible');
                    confirmationForm.classList.remove('hidden');
                }

                step.confirmation = true;
                // Start timer for code verification
                const ttl = response.data.phone_verification_ttl;
                startVerificationTimer(ttl, step);
            } else if (
                response.code === -24 &&
                response.message.reason === 'verification_locked'
            ) {
                const { rest_time } = response.message;
                submitButton.disabled = true;
                phoneInput.disabled = true;
                step.verification = true;
                startVerificationTimer(rest_time, step);
            }
        };

        //User starts to change phone number
        phoneInput.addEventListener('input', (e) => {
            if (e.target.value.slice(1) === userPhoneNumber) {
                submitButton.innerHTML = 'ПІДТВЕРДИТИ';
            } else {
                submitButton.innerHTML = 'ЗБЕРЕГТИ';
            }
        });

        // User submits verification form
        verificationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log(
                '%c Form submitted',
                'color: #ff00ff; font-weight: bold',
                e
            );
            submitButton.disabled = true;
            const submittedPhone = e.target[0].value.slice(1);

            if (!isPhoneValid(submittedPhone)) {
                const message = 'Формат телефону вказано неправильно';
                showInputMessage(message, verificationForm, 'error');
                submitButton.disabled = false;

                return;
            }

            try {
                const userId = user.data.account.id;
                const userData = new FormData();

                userData.append('phone', submittedPhone);
                userData.append('userid', userId);

                //Change user phone number
                if (submittedPhone !== userPhoneNumber) {
                    const response = await changeUserPhone(userData);

                    if (response.error === 'no' && !response.error_code) {
                        userPhoneNumber = response.phone;
                        submitButton.innerHTML = 'Підтвердити';
                        submitButton.disabled = false;
                    }

                    return;
                }
                //Verify user phone number
                const response = await verifyUserPhone(cid);

                if (response) {
                    console.log('inside if');
                    handleVerificationResponse(response);
                } else {
                    console.log('inside else');
                    throw response;
                }

                // Add verification record
                // const verificationRecord = new FormData();

                // verificationRecord.append('phoneWithoutPlus', phone);
                // verificationRecord.append('userid', userId);
                // await addVerification(verificationRecord);

                submitButton.disabled = true;
            } catch (error) {
                console.error('Verification process failed:', error);
                submitButton.disabled = false;
            }
        });

        // Add confirmation form handler
        confirmationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            confirmButton.disabled = true;
            // Check if verification has expired
            if (confirmationForm.dataset.confirmationExpired === 'true') {
                // Reset the form state
                confirmationForm.dataset.confirmationExpired = 'false';
                const codeInput = document.getElementById('confirmation-code');
                codeInput.required = true;

                // Trigger new verification
                try {
                    const response = await verifyUserPhone(cid);
                    if (response) {
                        handleVerificationResponse(response);
                    }
                } catch (error) {
                    console.error('Error resending verification code:', error);
                }
                confirmButton.disabled = false;
                return;
            }

            const code = document.getElementById('confirmation-code').value;

            try {
                const response = await confirmUserPhone(
                    code,
                    verificationSession
                );

                if (response.ok) {
                    document.querySelector('.form__wrapper').style.display =
                        'none';

                    // Update header text and data-translate
                    const header = document.querySelector('.form__header');
                    header.textContent = 'ТВІЙ НОМЕР ВЕРИФІКОВАНО';
                    header.setAttribute('data-translate', 'formHeaderSuccess');

                    // Update description text and data-translate
                    const description =
                        document.querySelector('.form__description');
                    description.textContent =
                        'Ваш персональний бонус зараховано в розділ "Бонуси"';
                    description.setAttribute(
                        'data-translate',
                        'formDescriptionSuccess'
                    );
                    const successImageWrapper = document.querySelector(
                        '.successImageWrapper'
                    );
                    successImageWrapper.classList.add('visible');
                    successImageWrapper.classList.remove('hidden');

                    // Create first div
                    const firstDiv = document.createElement('div');
                    firstDiv.className = 'successImageWrapper-prizeInfo';

                    const firstSpan = document.createElement('span');
                    firstSpan.textContent = 'СТРАХОВКА ДО';
                    firstSpan.setAttribute(
                        'data-translate',
                        'prizeInfoInsurance'
                    );

                    const secondSpan = document.createElement('span');
                    secondSpan.textContent = 'СТАВКИ 100 ₴';
                    secondSpan.setAttribute('data-translate', 'prizeInfoValue');

                    // Append spans to first div
                    firstDiv.appendChild(firstSpan);
                    firstDiv.appendChild(secondSpan);

                    // Create second div
                    const secondDiv = document.createElement('div');
                    secondDiv.className = 'successImageWrapper-bonusSpark';

                    // Append divs to container
                    successImageWrapper.appendChild(firstDiv);
                    successImageWrapper.appendChild(secondDiv);

                    linkButtonWrapper.style.display = 'flex';
                    const linkButton = document.querySelector(
                        '.link__button-wrapper a'
                    );
                    linkButton.href = '/personal-office/bonuses/betinsurance';
                    linkButton.textContent = 'ДО БОНУСУ';
                    linkButton.setAttribute('data-translate', 'confirmSuccess');
                } else {
                    //TODO
                    //need to check other possible errors
                    // showInputMessage(
                    //     'Невірний код підтвердження',
                    //     confirmationForm
                    // );
                }
            } catch (error) {
                console.error('Error confirming code:', error);
                if (
                    error.code === -4 &&
                    error.message.reason === 'wrong_session_or_confirm_code'
                ) {
                    const messageElement = document.createElement('div');
                    messageElement.classList.add('input-msg', 'error');
                    messageElement.setAttribute('data-code-error', 'true');
                    messageElement.textContent =
                        'Неправильний код підтвердження';

                    const inputElement =
                        confirmationForm.querySelector('input');
                    const buttonElement =
                        confirmationForm.querySelector('button');
                    inputElement.parentNode.insertBefore(
                        messageElement,
                        buttonElement
                    );
                }
            } finally {
                confirmButton.disabled = false;
            }
        });
    };

    init();
})();
