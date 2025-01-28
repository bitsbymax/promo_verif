(function () {
    const ERROR_MESSAGES = {
        INVALID_PHONE_FORMAT: {
            message: 'Формат телефону вказано неправильно',
            translateKey: 'errorInvalidPhoneFormat',
        },
        PHONE_ALREADY_USED: {
            message: 'Цей номер телефону вже використовується',
            translateKey: 'errorPhoneAlreadyUsed',
        },
        PHONE_CONFIRMED_BY_ANOTHER: {
            message: 'Цей номер телефону було підтверджено іншим користувачем',
            translateKey: 'errorPhoneConfirmedByAnother',
        },
        VERIFICATION_EXPIRED: {
            message: 'Час верифікації минув',
            translateKey: 'errorVerificationExpired',
        },
        INVALID_CONFIRMATION_CODE: {
            message: 'Неправильний код підтвердження',
            translateKey: 'errorInvalidConfirmationCode',
        },
        VERIFICATION_LOCKED: {
            message: 'верифікацію заблоковано. Дочекайтесь оновлення таймера',
            translateKey: 'errorVerificationLocked',
        },
        SMS_CODE_TIMER: {
            message:
                'час, який залишився, щоб ввести код з SMS-повідомлення. Після закінчення часу можна запросити код повторно',
            translateKey: 'smsCodeTimer',
        },
    };
    const API = 'https://fav-prom.com';
    const phoneInput = document.getElementById('phone');
    const confirmationCodeInput = document.getElementById('confirmation-code');
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
            const response = await fetch('/accounting/api/change_user', {
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

    const addVerification = async (data) => {
        try {
            await fetch(`${API}/api_verification`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
        } catch (error) {
            console.error('Error adding verification:', error);
            throw error;
        }
    };

    const showInputMessage = (message, targetElement, state = false) => {
        const inputElement = targetElement.querySelector('input');
        const buttonElement = targetElement.querySelector('button');

        // Remove all messages if called from timer expiration
        if (
            targetElement.id === 'confirmation__form' &&
            targetElement.dataset.confirmationExpired === 'true'
        ) {
            const allMessages = targetElement.querySelectorAll('.input-msg');
            allMessages.forEach((msg) => msg.remove());
        }

        // Find error message object if it exists
        let errorObj = null;
        for (const key in ERROR_MESSAGES) {
            if (ERROR_MESSAGES[key].message === message) {
                errorObj = ERROR_MESSAGES[key];
                break;
            }
        }

        // Check for existing messages with the same content
        const existingMessages = targetElement.querySelectorAll('.input-msg');
        for (const msg of existingMessages) {
            if (msg.hasAttribute('data-code-error')) continue;

            if (Array.isArray(message) && message.length === 2) {
                const timerWrapper = msg.querySelector('.timerWrapper');
                if (timerWrapper) {
                    const timer = timerWrapper.querySelector('.timer');
                    if (timer) {
                        timer.textContent = message[0];
                        return;
                    }
                }
            } else if (msg.textContent === message) {
                return;
            }

            msg.remove();
        }

        // Create new message element
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
            secondSpan.classList.add(state ? 'error' : 'warning');

            // Add translation key if message matches the verification locked or SMS timer message
            if (message[1] === ERROR_MESSAGES.VERIFICATION_LOCKED.message) {
                secondSpan.setAttribute(
                    'data-translate',
                    ERROR_MESSAGES.VERIFICATION_LOCKED.translateKey
                );
            } else if (message[1] === ERROR_MESSAGES.SMS_CODE_TIMER.message) {
                secondSpan.setAttribute(
                    'data-translate',
                    ERROR_MESSAGES.SMS_CODE_TIMER.translateKey
                );
            }

            messageElement.appendChild(timerWrapper);
            messageElement.appendChild(document.createTextNode(' '));
            messageElement.appendChild(secondSpan);
        } else {
            messageElement.textContent = message;

            // Add translation key if error message exists in our structure
            if (errorObj) {
                messageElement.setAttribute(
                    'data-translate',
                    errorObj.translateKey
                );
            }
        }

        messageElement.classList.add(state ? 'error' : 'warning');

        // Handle message positioning
        if (message === 'Неправильний код підтвердження') {
            messageElement.setAttribute('data-code-error', 'true');
            // Always insert error messages at the top
            inputElement.parentNode.insertBefore(
                messageElement,
                inputElement.nextSibling
            );

            // Move any existing non-error messages below this one
            const otherMessages = targetElement.querySelectorAll(
                '.input-msg:not([data-code-error])'
            );
            otherMessages.forEach((msg) => {
                messageElement.parentNode.insertBefore(
                    msg,
                    messageElement.nextSibling
                );
            });
        } else {
            // For non-error messages, insert after any existing error message, or before the button
            const existingErrorMsg =
                targetElement.querySelector('[data-code-error]');
            const insertBefore = existingErrorMsg
                ? existingErrorMsg.nextSibling
                : buttonElement;
            inputElement.parentNode.insertBefore(messageElement, insertBefore);
        }
    };

    const isPhoneValid = (phone) => {
        const phoneRegex = /^\+380\d{9}$/;
        return phoneRegex.test(phone);
    };

    const removeExistingMessages = (targetElement) => {
        const existingMessages = targetElement.querySelectorAll('.input-msg');
        existingMessages.forEach((msg) => msg.remove());
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
        let submittedPhone = null;

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
            confirmButton.textContent = 'НАДІСЛАТИ';
            confirmButton.setAttribute(
                'data-translate',
                'sendConfirmationCode'
            );

            if (verificationTimer) {
                clearInterval(verificationTimer);
            }

            let timeLeft = totalSeconds;

            verificationTimer = setInterval(() => {
                if (timeLeft <= 0) {
                    clearInterval(verificationTimer);

                    confirmButton.disabled = false;
                    confirmButton.textContent = 'НАДІСЛАТИ ПОВТОРНО';
                    confirmButton.setAttribute(
                        'data-translate',
                        'resendConfirmationCode'
                    );

                    removeExistingMessages(verificationForm);

                    // Reset the form and remove required attribute
                    const codeInput =
                        document.getElementById('confirmation-code');
                    codeInput.value = '';
                    codeInput.required = false;

                    // Change form submit behavior to verification and trigger cleanup
                    confirmationForm.dataset.confirmationExpired = 'true';

                    // Show message about expired code (cleanup will happen in showInputMessage)
                    showInputMessage(
                        ERROR_MESSAGES.VERIFICATION_EXPIRED.message,
                        confirmationForm,
                        'error'
                    );

                    return;
                }

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
                            ERROR_MESSAGES.VERIFICATION_LOCKED.message,
                        ],
                        verificationForm,
                        'error'
                    );
                }

                if (confirmation) {
                    showInputMessage(
                        [
                            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
                            ERROR_MESSAGES.SMS_CODE_TIMER.message,
                        ],
                        confirmationForm,
                        false
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
            } else if (
                response.code === -24 &&
                response.message.reason ===
                    'phone_number_has_been_confirmed_by_another_user'
            ) {
                submitButton.disabled = false;
                showInputMessage(
                    ERROR_MESSAGES.PHONE_CONFIRMED_BY_ANOTHER.message,
                    verificationForm,
                    'error'
                );
            }
        };

        //User starts to change phone number
        phoneInput.addEventListener('input', (e) => {
            const value = e.target.value;
            // Remove is-invalid class initially
            phoneInput.classList.remove('is-invalid');
            // Validate phone number
            if (!isPhoneValid(value)) {
                phoneInput.classList.add('is-invalid');
            } else {
                removeExistingMessages(verificationForm);
            }
            if (e.target.value.slice(1) === userPhoneNumber) {
                submitButton.innerHTML = 'ПІДТВЕРДИТИ';
                submitButton.setAttribute('data-translate', 'confirm');
            } else {
                submitButton.innerHTML = 'ЗБЕРЕГТИ';
                submitButton.setAttribute('data-translate', 'save');
            }
        });

        confirmationCodeInput.addEventListener('input', (e) => {
            // Remove non-numeric characters
            e.target.value = e.target.value.replace(/[^0-9]/g, '');

            // Add/remove .is-invalid class based on validation
            if (e.target.value.length !== 5) {
                e.target.classList.add('is-invalid');
            } else {
                e.target.classList.remove('is-invalid');
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
            submittedPhone = e.target[0].value;

            if (!isPhoneValid(submittedPhone)) {
                showInputMessage(ERROR_MESSAGES.INVALID_PHONE_FORMAT.message, verificationForm, 'error');
                submitButton.disabled = false;

                return;
            } else {
                removeExistingMessages(verificationForm);
            }

            try {
                const userId = user.data.account.id;
                const userData = new FormData();

                userData.append('phone', submittedPhone);
                userData.append('userid', userId);

                //Change user phone number
                if (submittedPhone !== `+${userPhoneNumber}`) {
                    const response = await changeUserPhone(userData);

                    if (response.error === 'no' && !response.error_code) {
                        removeExistingMessages(verificationForm);

                        userPhoneNumber = response.phone.slice(1);
                        submitButton.innerHTML = 'ПІДТВЕРДИТИ';
                        submitButton.disabled = false;
                    } else if (
                        response.error === 'yes' &&
                        response.error_code === 'accounting_error_02'
                    ) {
                        submitButton.disabled = false;
                        showInputMessage(
                            ERROR_MESSAGES.PHONE_ALREADY_USED.message,
                            verificationForm,
                            'error'
                        );
                    }

                    return;
                }
                //Verify user phone number
                const response = await verifyUserPhone(cid);

                if (response) {
                    handleVerificationResponse(response);
                } else {
                    throw response;
                }
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

            const code = confirmationCodeInput.value;

            // Validate length and numeric
            if (!/^\d{5}$/.test(code)) {
                confirmationCodeInput.classList.add('is-invalid');
                e.preventDefault();
                return;
            }

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

                    //! Add verification record
                    const userId = user.data.account.id;

                    await addVerification({
                        userid: userId,
                        phone: submittedPhone,
                    });
                }
            } catch (error) {
                console.error('Error confirming code:', error);
                if (
                    error.code === -4 &&
                    error.message.reason === 'wrong_session_or_confirm_code'
                ) {
                    showInputMessage(
                        ERROR_MESSAGES.INVALID_CONFIRMATION_CODE.message,
                        confirmationForm,
                        'error'
                    );
                }
            } finally {
                confirmButton.disabled = false;
            }
        });
    };

    init();
})();
