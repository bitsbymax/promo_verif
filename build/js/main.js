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
    const ENDPOINT = 'api_verification';

    // #region Translation
    const ukLeng = document.querySelector('#ukLeng');
    const enLeng = document.querySelector('#enLeng');
    let locale = 'uk';

    if (ukLeng) locale = 'uk';
    if (enLeng) locale = 'en';

    let i18nData = {};

    function loadTranslations() {
        return fetch(`${API}/${ENDPOINT}/translates/${locale}`)
            .then((res) => res.json())
            .then((json) => {
                i18nData = json;
                translate();

                const mutationObserver = new MutationObserver(function (
                    mutations
                ) {
                    translate();
                });
                mutationObserver.observe(
                    document.getElementById('verification'),
                    {
                        childList: true,
                        subtree: true,
                    }
                );
            });
    }

    function translate() {
        const elems = document.querySelectorAll('[data-translate]');
        if (elems && elems.length) {
            elems.forEach((elem) => {
                const key = elem.getAttribute('data-translate');
                elem.innerHTML = translateKey(key);
                elem.removeAttribute('data-translate');
            });
        }

        if (locale === 'en') {
            mainPage.classList.add('en');
        }

        refreshLocalizedClass();
    }

    function translateKey(key) {
        if (!key) {
            return;
        }
        return (
            i18nData[key] || '*----NEED TO BE TRANSLATED----*   key:  ' + key
        );
    }

    function refreshLocalizedClass(element, baseCssClass) {
        if (!element) {
            return;
        }
        for (const lang of ['uk', 'en']) {
            element.classList.remove(baseCssClass + lang);
        }
        element.classList.add(baseCssClass + locale);
    }

    // #endregion

    async function getUser() {
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
    }

    async function verifyUserPhone(cid) {
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
    }

    async function changeUserPhone(userData) {
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
    }

    async function confirmUserPhone(confirmCode, sessionId) {
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
    }

    async function addVerification(data) {
        try {
            await fetch(`${API}/${ENDPOINT}`, {
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
    }

    function showInputMessage(message, targetElement, state = false) {
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
    }

    function isPhoneValid(phone) {
        const phoneRegex = /^\+380\d{9}$/;
        return phoneRegex.test(phone);
    }

    function removeExistingMessages(targetElement) {
        const existingMessages = targetElement.querySelectorAll('.input-msg');
        existingMessages.forEach((msg) => msg.remove());
    }

    const phoneInput = document.getElementById('phone');
    const confirmationCodeInput = document.getElementById('confirmation-code');
    const verificationForm = document.getElementById('verification__form');
    const linkButtonWrapper = document.querySelector('.link__button-wrapper');
    const submitButton = document.getElementById('submit-button');

    //Test buttons
    const authorizedButton = document.querySelector('.button-authorized');
    const notAuthorizedButton = document.querySelector('.button-notAuthorized');
    const successButton = document.querySelector('.button-success');
    const successBeforeButton = document.querySelector('.button-successBefore');

    //States
    let authorized = false;
    let notAuthorized = true;
    let success = false;
    let successBefore = false;

    async function init() {
        console.log('%c init fired', 'color: #00ff00; font-weight: bold');
        console.log('%c init fired', 'color: #00ff00; font-weight: bold');
        // let userPhoneNumber = null;
        // let userPhoneVerified = false;

        const updateUIBasedOnState = () => {
            console.log('Updating UI, states:', {
                authorized,
                notAuthorized,
                successBefore,
                success,
            });
            const formWrapper = document.querySelector('.form__wrapper');
            const formContainer = document.querySelector('.form__container');
            const formContainerSuccessBefore = document.querySelector(
                '.form__container-successBefore'
            );

            // Reset all states first
            // formWrapper?.classList.remove('hidden', 'visible');
            // formContainer?.classList.remove('hidden', 'visible');
            // verificationForm?.classList.remove('hidden', 'visible');

            if (notAuthorized) {
                console.log('not authorized');
                formWrapper?.classList.add('hidden');
                linkButtonWrapper?.classList.add('visible');
            } else if (authorized) {
                console.log('authorized');
                linkButtonWrapper?.classList.add('hidden');
                linkButtonWrapper?.classList.remove('visible');

                formWrapper?.classList.remove('hidden');
                verificationForm?.classList.add('visible');
                verificationForm?.classList.remove('hidden');

            } else if (successBefore) {
                console.log('successBefore');
                formContainer?.classList.add('hidden');
                formContainerSuccessBefore?.classList.remove('hidden');
            }
        };

        authorizedButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('authorizedButton clicked');

            authorized = true;
            notAuthorized = false;
            success = false;
            successBefore = false;
            updateUIBasedOnState();
        });

        notAuthorizedButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('notAuthorizedButton clicked');
            authorized = false;
            notAuthorized = true;
            success = false;
            successBefore = false;
            updateUIBasedOnState();
        });

        // successButton.addEventListener('click', (e) => {
        //     e.preventDefault();
        //     updateUIBasedOnState();
        // });

        successBeforeButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('successBeforeButton clicked');
            authorized = false;
            notAuthorized = false;
            success = false;
            successBefore = true;
            updateUIBasedOnState();
        });

        // Initial UI update
        updateUIBasedOnState();

        // if (window.FE?.user.role === 'guest') {
        //     document.querySelector('.form__wrapper').classList.add('hidden');
        //     linkButtonWrapper.classList.add('visible');
        //     linkButtonWrapper.classList.remove('hidden');

        //     return;
        // } else {
        //     verificationForm.classList.add('visible');
        //     verificationForm.classList.remove('hidden');
        // }

        const confirmationForm = document.getElementById('confirmation__form');
        const confirmButton = document.getElementById('confirm-button');

        let verificationSession = null;
        let verificationTimer = null;
        let user = null;
        let cid = null;

        let submittedPhone = null;

        try {
            // user = await getUser();
            // cid = user.cid;
            // userPhoneNumber = user.data.account.phone_number;
            // console.log('userPhoneNumber:', userPhoneNumber);
            // userPhoneVerified = user.data.account.account_status.find(
            //     (status) => status.alias === 'IS_PHONE_VERIFIED'
            // ).value;
            // console.log('userPhoneVerified:', userPhoneVerified);
            // userPhoneNumber = true;
            // userPhoneVerified = true;
            // Check if user has a number and is already verified
            // if (userPhoneNumber && userPhoneVerified) {
            //     document
            //         .querySelector('.form__container')
            //         .classList.add('hidden');
            //     document
            //         .querySelector('.form__container-successBefore')
            //         .classList.remove('hidden');

            //     return;
            // }

            // verificationForm.classList.remove('hidden');
            // verificationForm.classList.add('visible');
            // phoneInput.value = `+${userPhoneNumber}`;
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
                showInputMessage(
                    ERROR_MESSAGES.INVALID_PHONE_FORMAT.message,
                    verificationForm,
                    'error'
                );
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
                    console.log('TRY CHANGE USER PHONE---VERIF FORM');
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
                console.log('TRY VERIFY USER PHONE---VERIF FORM');
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
            console.log('submitter phone', submittedPhone);

            // Check if verification has expired
            if (confirmationForm.dataset.confirmationExpired === 'true') {
                // Reset the form state
                confirmationForm.dataset.confirmationExpired = 'false';
                const codeInput = document.getElementById('confirmation-code');
                codeInput.required = true;

                // Trigger new verification
                try {
                    console.log('TRY VERIFY USER PHONE---CONF FORM');
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
                console.log('inside validate fn() ---code is invalid');
                confirmationCodeInput.classList.add('is-invalid');
                confirmButton.disabled = false;

                return;
            }

            try {
                console.log('TRY CONFIRM USER PHONE---CONF FORM');
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
    }

    // loadTranslations().then(init);
    init();

    // const mainPage = document.querySelector('.fav__page');
    // setTimeout(() => mainPage.classList.add('overflow'), 1000);
})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uICgpIHtcbiAgICBjb25zdCBFUlJPUl9NRVNTQUdFUyA9IHtcbiAgICAgICAgSU5WQUxJRF9QSE9ORV9GT1JNQVQ6IHtcbiAgICAgICAgICAgIG1lc3NhZ2U6ICfQpNC+0YDQvNCw0YIg0YLQtdC70LXRhNC+0L3RgyDQstC60LDQt9Cw0L3QviDQvdC10L/RgNCw0LLQuNC70YzQvdC+JyxcbiAgICAgICAgICAgIHRyYW5zbGF0ZUtleTogJ2Vycm9ySW52YWxpZFBob25lRm9ybWF0JyxcbiAgICAgICAgfSxcbiAgICAgICAgUEhPTkVfQUxSRUFEWV9VU0VEOiB7XG4gICAgICAgICAgICBtZXNzYWdlOiAn0KbQtdC5INC90L7QvNC10YAg0YLQtdC70LXRhNC+0L3RgyDQstC20LUg0LLQuNC60L7RgNC40YHRgtC+0LLRg9GU0YLRjNGB0Y8nLFxuICAgICAgICAgICAgdHJhbnNsYXRlS2V5OiAnZXJyb3JQaG9uZUFscmVhZHlVc2VkJyxcbiAgICAgICAgfSxcbiAgICAgICAgUEhPTkVfQ09ORklSTUVEX0JZX0FOT1RIRVI6IHtcbiAgICAgICAgICAgIG1lc3NhZ2U6ICfQptC10Lkg0L3QvtC80LXRgCDRgtC10LvQtdGE0L7QvdGDINCx0YPQu9C+INC/0ZbQtNGC0LLQtdGA0LTQttC10L3QviDRltC90YjQuNC8INC60L7RgNC40YHRgtGD0LLQsNGH0LXQvCcsXG4gICAgICAgICAgICB0cmFuc2xhdGVLZXk6ICdlcnJvclBob25lQ29uZmlybWVkQnlBbm90aGVyJyxcbiAgICAgICAgfSxcbiAgICAgICAgVkVSSUZJQ0FUSU9OX0VYUElSRUQ6IHtcbiAgICAgICAgICAgIG1lc3NhZ2U6ICfQp9Cw0YEg0LLQtdGA0LjRhNGW0LrQsNGG0ZbRlyDQvNC40L3Rg9CyJyxcbiAgICAgICAgICAgIHRyYW5zbGF0ZUtleTogJ2Vycm9yVmVyaWZpY2F0aW9uRXhwaXJlZCcsXG4gICAgICAgIH0sXG4gICAgICAgIElOVkFMSURfQ09ORklSTUFUSU9OX0NPREU6IHtcbiAgICAgICAgICAgIG1lc3NhZ2U6ICfQndC10L/RgNCw0LLQuNC70YzQvdC40Lkg0LrQvtC0INC/0ZbQtNGC0LLQtdGA0LTQttC10L3QvdGPJyxcbiAgICAgICAgICAgIHRyYW5zbGF0ZUtleTogJ2Vycm9ySW52YWxpZENvbmZpcm1hdGlvbkNvZGUnLFxuICAgICAgICB9LFxuICAgICAgICBWRVJJRklDQVRJT05fTE9DS0VEOiB7XG4gICAgICAgICAgICBtZXNzYWdlOiAn0LLQtdGA0LjRhNGW0LrQsNGG0ZbRjiDQt9Cw0LHQu9C+0LrQvtCy0LDQvdC+LiDQlNC+0YfQtdC60LDQudGC0LXRgdGMINC+0L3QvtCy0LvQtdC90L3RjyDRgtCw0LnQvNC10YDQsCcsXG4gICAgICAgICAgICB0cmFuc2xhdGVLZXk6ICdlcnJvclZlcmlmaWNhdGlvbkxvY2tlZCcsXG4gICAgICAgIH0sXG4gICAgICAgIFNNU19DT0RFX1RJTUVSOiB7XG4gICAgICAgICAgICBtZXNzYWdlOlxuICAgICAgICAgICAgICAgICfRh9Cw0YEsINGP0LrQuNC5INC30LDQu9C40YjQuNCy0YHRjywg0YnQvtCxINCy0LLQtdGB0YLQuCDQutC+0LQg0LcgU01TLdC/0L7QstGW0LTQvtC80LvQtdC90L3Rjy4g0J/RltGB0LvRjyDQt9Cw0LrRltC90YfQtdC90L3RjyDRh9Cw0YHRgyDQvNC+0LbQvdCwINC30LDQv9GA0L7RgdC40YLQuCDQutC+0LQg0L/QvtCy0YLQvtGA0L3QvicsXG4gICAgICAgICAgICB0cmFuc2xhdGVLZXk6ICdzbXNDb2RlVGltZXInLFxuICAgICAgICB9LFxuICAgIH07XG4gICAgY29uc3QgQVBJID0gJ2h0dHBzOi8vZmF2LXByb20uY29tJztcbiAgICBjb25zdCBFTkRQT0lOVCA9ICdhcGlfdmVyaWZpY2F0aW9uJztcblxuICAgIC8vICNyZWdpb24gVHJhbnNsYXRpb25cbiAgICBjb25zdCB1a0xlbmcgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjdWtMZW5nJyk7XG4gICAgY29uc3QgZW5MZW5nID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2VuTGVuZycpO1xuICAgIGxldCBsb2NhbGUgPSAndWsnO1xuXG4gICAgaWYgKHVrTGVuZykgbG9jYWxlID0gJ3VrJztcbiAgICBpZiAoZW5MZW5nKSBsb2NhbGUgPSAnZW4nO1xuXG4gICAgbGV0IGkxOG5EYXRhID0ge307XG5cbiAgICBmdW5jdGlvbiBsb2FkVHJhbnNsYXRpb25zKCkge1xuICAgICAgICByZXR1cm4gZmV0Y2goYCR7QVBJfS8ke0VORFBPSU5UfS90cmFuc2xhdGVzLyR7bG9jYWxlfWApXG4gICAgICAgICAgICAudGhlbigocmVzKSA9PiByZXMuanNvbigpKVxuICAgICAgICAgICAgLnRoZW4oKGpzb24pID0+IHtcbiAgICAgICAgICAgICAgICBpMThuRGF0YSA9IGpzb247XG4gICAgICAgICAgICAgICAgdHJhbnNsYXRlKCk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBtdXRhdGlvbk9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoZnVuY3Rpb24gKFxuICAgICAgICAgICAgICAgICAgICBtdXRhdGlvbnNcbiAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNsYXRlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgbXV0YXRpb25PYnNlcnZlci5vYnNlcnZlKFxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndmVyaWZpY2F0aW9uJyksXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkTGlzdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1YnRyZWU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHJhbnNsYXRlKCkge1xuICAgICAgICBjb25zdCBlbGVtcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ1tkYXRhLXRyYW5zbGF0ZV0nKTtcbiAgICAgICAgaWYgKGVsZW1zICYmIGVsZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgZWxlbXMuZm9yRWFjaCgoZWxlbSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGVsZW0uZ2V0QXR0cmlidXRlKCdkYXRhLXRyYW5zbGF0ZScpO1xuICAgICAgICAgICAgICAgIGVsZW0uaW5uZXJIVE1MID0gdHJhbnNsYXRlS2V5KGtleSk7XG4gICAgICAgICAgICAgICAgZWxlbS5yZW1vdmVBdHRyaWJ1dGUoJ2RhdGEtdHJhbnNsYXRlJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChsb2NhbGUgPT09ICdlbicpIHtcbiAgICAgICAgICAgIG1haW5QYWdlLmNsYXNzTGlzdC5hZGQoJ2VuJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZWZyZXNoTG9jYWxpemVkQ2xhc3MoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0cmFuc2xhdGVLZXkoa2V5KSB7XG4gICAgICAgIGlmICgha2V5KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIGkxOG5EYXRhW2tleV0gfHwgJyotLS0tTkVFRCBUTyBCRSBUUkFOU0xBVEVELS0tLSogICBrZXk6ICAnICsga2V5XG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVmcmVzaExvY2FsaXplZENsYXNzKGVsZW1lbnQsIGJhc2VDc3NDbGFzcykge1xuICAgICAgICBpZiAoIWVsZW1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGxhbmcgb2YgWyd1aycsICdlbiddKSB7XG4gICAgICAgICAgICBlbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoYmFzZUNzc0NsYXNzICsgbGFuZyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxlbWVudC5jbGFzc0xpc3QuYWRkKGJhc2VDc3NDbGFzcyArIGxvY2FsZSk7XG4gICAgfVxuXG4gICAgLy8gI2VuZHJlZ2lvblxuXG4gICAgYXN5bmMgZnVuY3Rpb24gZ2V0VXNlcigpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IHdpbmRvdy5GRS5zb2NrZXRfc2VuZCh7XG4gICAgICAgICAgICAgICAgY21kOiAnZ2V0X3VzZXInLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZ2V0VXNlciByZXNwb25zZScsIHJlcyk7XG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZmV0Y2hpbmcgdXNlcjonLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGZ1bmN0aW9uIHZlcmlmeVVzZXJQaG9uZShjaWQpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IHdpbmRvdy5GRS5zb2NrZXRfc2VuZCh7XG4gICAgICAgICAgICAgICAgY21kOiAnYWNjb3VudGluZy91c2VyX3Bob25lX3ZlcmlmeScsXG4gICAgICAgICAgICAgICAgY2lkLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygndmVyaWZ5VXNlclBob25lIHJlc3BvbnNlJywgcmVzKTtcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciB2ZXJpZnlpbmcgdXNlciBwaG9uZTonLCBlcnJvcik7XG5cbiAgICAgICAgICAgIHJldHVybiBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGZ1bmN0aW9uIGNoYW5nZVVzZXJQaG9uZSh1c2VyRGF0YSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCgnL2FjY291bnRpbmcvYXBpL2NoYW5nZV91c2VyJywge1xuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIGJvZHk6IHVzZXJEYXRhLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2NoYW5nZVVzZXJQaG9uZSByZXNwb25zZTonLCBkYXRhKTtcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgY2hhbmdpbmcgdXNlciBwaG9uZTonLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGZ1bmN0aW9uIGNvbmZpcm1Vc2VyUGhvbmUoY29uZmlybUNvZGUsIHNlc3Npb25JZCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzID0gYXdhaXQgd2luZG93LkZFLnNvY2tldF9zZW5kKHtcbiAgICAgICAgICAgICAgICBjbWQ6ICdhY2NvdW50aW5nL3VzZXJfcGhvbmVfY29uZmlybScsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBjb25maXJtX2NvZGU6IGAke2NvbmZpcm1Db2RlfWAsXG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb25faWQ6IGAke3Nlc3Npb25JZH1gLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ2NvbmZpcm1Vc2VyUGhvbmUgcmVzcG9uc2UnLCByZXMpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGNvbmZpcm1pbmcgdXNlciBwaG9uZTonLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGZ1bmN0aW9uIGFkZFZlcmlmaWNhdGlvbihkYXRhKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCBmZXRjaChgJHtBUEl9LyR7RU5EUE9JTlR9YCwge1xuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBhZGRpbmcgdmVyaWZpY2F0aW9uOicsIGVycm9yKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd0lucHV0TWVzc2FnZShtZXNzYWdlLCB0YXJnZXRFbGVtZW50LCBzdGF0ZSA9IGZhbHNlKSB7XG4gICAgICAgIGNvbnN0IGlucHV0RWxlbWVudCA9IHRhcmdldEVsZW1lbnQucXVlcnlTZWxlY3RvcignaW5wdXQnKTtcbiAgICAgICAgY29uc3QgYnV0dG9uRWxlbWVudCA9IHRhcmdldEVsZW1lbnQucXVlcnlTZWxlY3RvcignYnV0dG9uJyk7XG5cbiAgICAgICAgLy8gUmVtb3ZlIGFsbCBtZXNzYWdlcyBpZiBjYWxsZWQgZnJvbSB0aW1lciBleHBpcmF0aW9uXG4gICAgICAgIGlmIChcbiAgICAgICAgICAgIHRhcmdldEVsZW1lbnQuaWQgPT09ICdjb25maXJtYXRpb25fX2Zvcm0nICYmXG4gICAgICAgICAgICB0YXJnZXRFbGVtZW50LmRhdGFzZXQuY29uZmlybWF0aW9uRXhwaXJlZCA9PT0gJ3RydWUnXG4gICAgICAgICkge1xuICAgICAgICAgICAgY29uc3QgYWxsTWVzc2FnZXMgPSB0YXJnZXRFbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5pbnB1dC1tc2cnKTtcbiAgICAgICAgICAgIGFsbE1lc3NhZ2VzLmZvckVhY2goKG1zZykgPT4gbXNnLnJlbW92ZSgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZpbmQgZXJyb3IgbWVzc2FnZSBvYmplY3QgaWYgaXQgZXhpc3RzXG4gICAgICAgIGxldCBlcnJvck9iaiA9IG51bGw7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIEVSUk9SX01FU1NBR0VTKSB7XG4gICAgICAgICAgICBpZiAoRVJST1JfTUVTU0FHRVNba2V5XS5tZXNzYWdlID09PSBtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgZXJyb3JPYmogPSBFUlJPUl9NRVNTQUdFU1trZXldO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIGV4aXN0aW5nIG1lc3NhZ2VzIHdpdGggdGhlIHNhbWUgY29udGVudFxuICAgICAgICBjb25zdCBleGlzdGluZ01lc3NhZ2VzID0gdGFyZ2V0RWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuaW5wdXQtbXNnJyk7XG4gICAgICAgIGZvciAoY29uc3QgbXNnIG9mIGV4aXN0aW5nTWVzc2FnZXMpIHtcbiAgICAgICAgICAgIGlmIChtc2cuaGFzQXR0cmlidXRlKCdkYXRhLWNvZGUtZXJyb3InKSkgY29udGludWU7XG5cbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KG1lc3NhZ2UpICYmIG1lc3NhZ2UubGVuZ3RoID09PSAyKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGltZXJXcmFwcGVyID0gbXNnLnF1ZXJ5U2VsZWN0b3IoJy50aW1lcldyYXBwZXInKTtcbiAgICAgICAgICAgICAgICBpZiAodGltZXJXcmFwcGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVyID0gdGltZXJXcmFwcGVyLnF1ZXJ5U2VsZWN0b3IoJy50aW1lcicpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGltZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVyLnRleHRDb250ZW50ID0gbWVzc2FnZVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAobXNnLnRleHRDb250ZW50ID09PSBtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBtc2cucmVtb3ZlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDcmVhdGUgbmV3IG1lc3NhZ2UgZWxlbWVudFxuICAgICAgICBjb25zdCBtZXNzYWdlRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICBtZXNzYWdlRWxlbWVudC5jbGFzc0xpc3QuYWRkKCdpbnB1dC1tc2cnKTtcblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShtZXNzYWdlKSAmJiBtZXNzYWdlLmxlbmd0aCA9PT0gMikge1xuICAgICAgICAgICAgY29uc3QgdGltZXJXcmFwcGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICB0aW1lcldyYXBwZXIuY2xhc3NMaXN0LmFkZCgndGltZXJXcmFwcGVyJyk7XG4gICAgICAgICAgICB0aW1lcldyYXBwZXIuc3R5bGUubWluV2lkdGggPSBzdGF0ZSA/ICc2NXB4JyA6ICc0NXB4JztcblxuICAgICAgICAgICAgY29uc3QgZmlyc3RTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgZmlyc3RTcGFuLnRleHRDb250ZW50ID0gbWVzc2FnZVswXTtcbiAgICAgICAgICAgIGZpcnN0U3Bhbi5jbGFzc0xpc3QuYWRkKCd0aW1lcicpO1xuXG4gICAgICAgICAgICB0aW1lcldyYXBwZXIuYXBwZW5kQ2hpbGQoZmlyc3RTcGFuKTtcblxuICAgICAgICAgICAgY29uc3Qgc2Vjb25kU3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIHNlY29uZFNwYW4udGV4dENvbnRlbnQgPSBtZXNzYWdlWzFdO1xuICAgICAgICAgICAgc2Vjb25kU3Bhbi5jbGFzc0xpc3QuYWRkKHN0YXRlID8gJ2Vycm9yJyA6ICd3YXJuaW5nJyk7XG5cbiAgICAgICAgICAgIC8vIEFkZCB0cmFuc2xhdGlvbiBrZXkgaWYgbWVzc2FnZSBtYXRjaGVzIHRoZSB2ZXJpZmljYXRpb24gbG9ja2VkIG9yIFNNUyB0aW1lciBtZXNzYWdlXG4gICAgICAgICAgICBpZiAobWVzc2FnZVsxXSA9PT0gRVJST1JfTUVTU0FHRVMuVkVSSUZJQ0FUSU9OX0xPQ0tFRC5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgc2Vjb25kU3Bhbi5zZXRBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgICAgICAgICdkYXRhLXRyYW5zbGF0ZScsXG4gICAgICAgICAgICAgICAgICAgIEVSUk9SX01FU1NBR0VTLlZFUklGSUNBVElPTl9MT0NLRUQudHJhbnNsYXRlS2V5XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZVsxXSA9PT0gRVJST1JfTUVTU0FHRVMuU01TX0NPREVfVElNRVIubWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIHNlY29uZFNwYW4uc2V0QXR0cmlidXRlKFxuICAgICAgICAgICAgICAgICAgICAnZGF0YS10cmFuc2xhdGUnLFxuICAgICAgICAgICAgICAgICAgICBFUlJPUl9NRVNTQUdFUy5TTVNfQ09ERV9USU1FUi50cmFuc2xhdGVLZXlcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBtZXNzYWdlRWxlbWVudC5hcHBlbmRDaGlsZCh0aW1lcldyYXBwZXIpO1xuICAgICAgICAgICAgbWVzc2FnZUVsZW1lbnQuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJyAnKSk7XG4gICAgICAgICAgICBtZXNzYWdlRWxlbWVudC5hcHBlbmRDaGlsZChzZWNvbmRTcGFuKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1lc3NhZ2VFbGVtZW50LnRleHRDb250ZW50ID0gbWVzc2FnZTtcblxuICAgICAgICAgICAgLy8gQWRkIHRyYW5zbGF0aW9uIGtleSBpZiBlcnJvciBtZXNzYWdlIGV4aXN0cyBpbiBvdXIgc3RydWN0dXJlXG4gICAgICAgICAgICBpZiAoZXJyb3JPYmopIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlRWxlbWVudC5zZXRBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgICAgICAgICdkYXRhLXRyYW5zbGF0ZScsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yT2JqLnRyYW5zbGF0ZUtleVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBtZXNzYWdlRWxlbWVudC5jbGFzc0xpc3QuYWRkKHN0YXRlID8gJ2Vycm9yJyA6ICd3YXJuaW5nJyk7XG5cbiAgICAgICAgLy8gSGFuZGxlIG1lc3NhZ2UgcG9zaXRpb25pbmdcbiAgICAgICAgaWYgKG1lc3NhZ2UgPT09ICfQndC10L/RgNCw0LLQuNC70YzQvdC40Lkg0LrQvtC0INC/0ZbQtNGC0LLQtdGA0LTQttC10L3QvdGPJykge1xuICAgICAgICAgICAgbWVzc2FnZUVsZW1lbnQuc2V0QXR0cmlidXRlKCdkYXRhLWNvZGUtZXJyb3InLCAndHJ1ZScpO1xuICAgICAgICAgICAgLy8gQWx3YXlzIGluc2VydCBlcnJvciBtZXNzYWdlcyBhdCB0aGUgdG9wXG4gICAgICAgICAgICBpbnB1dEVsZW1lbnQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoXG4gICAgICAgICAgICAgICAgbWVzc2FnZUVsZW1lbnQsXG4gICAgICAgICAgICAgICAgaW5wdXRFbGVtZW50Lm5leHRTaWJsaW5nXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAvLyBNb3ZlIGFueSBleGlzdGluZyBub24tZXJyb3IgbWVzc2FnZXMgYmVsb3cgdGhpcyBvbmVcbiAgICAgICAgICAgIGNvbnN0IG90aGVyTWVzc2FnZXMgPSB0YXJnZXRFbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXG4gICAgICAgICAgICAgICAgJy5pbnB1dC1tc2c6bm90KFtkYXRhLWNvZGUtZXJyb3JdKSdcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBvdGhlck1lc3NhZ2VzLmZvckVhY2goKG1zZykgPT4ge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VFbGVtZW50LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKFxuICAgICAgICAgICAgICAgICAgICBtc2csXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VFbGVtZW50Lm5leHRTaWJsaW5nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRm9yIG5vbi1lcnJvciBtZXNzYWdlcywgaW5zZXJ0IGFmdGVyIGFueSBleGlzdGluZyBlcnJvciBtZXNzYWdlLCBvciBiZWZvcmUgdGhlIGJ1dHRvblxuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmdFcnJvck1zZyA9XG4gICAgICAgICAgICAgICAgdGFyZ2V0RWxlbWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1jb2RlLWVycm9yXScpO1xuICAgICAgICAgICAgY29uc3QgaW5zZXJ0QmVmb3JlID0gZXhpc3RpbmdFcnJvck1zZ1xuICAgICAgICAgICAgICAgID8gZXhpc3RpbmdFcnJvck1zZy5uZXh0U2libGluZ1xuICAgICAgICAgICAgICAgIDogYnV0dG9uRWxlbWVudDtcbiAgICAgICAgICAgIGlucHV0RWxlbWVudC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShtZXNzYWdlRWxlbWVudCwgaW5zZXJ0QmVmb3JlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzUGhvbmVWYWxpZChwaG9uZSkge1xuICAgICAgICBjb25zdCBwaG9uZVJlZ2V4ID0gL15cXCszODBcXGR7OX0kLztcbiAgICAgICAgcmV0dXJuIHBob25lUmVnZXgudGVzdChwaG9uZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVtb3ZlRXhpc3RpbmdNZXNzYWdlcyh0YXJnZXRFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IGV4aXN0aW5nTWVzc2FnZXMgPSB0YXJnZXRFbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5pbnB1dC1tc2cnKTtcbiAgICAgICAgZXhpc3RpbmdNZXNzYWdlcy5mb3JFYWNoKChtc2cpID0+IG1zZy5yZW1vdmUoKSk7XG4gICAgfVxuXG4gICAgY29uc3QgcGhvbmVJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwaG9uZScpO1xuICAgIGNvbnN0IGNvbmZpcm1hdGlvbkNvZGVJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb25maXJtYXRpb24tY29kZScpO1xuICAgIGNvbnN0IHZlcmlmaWNhdGlvbkZvcm0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndmVyaWZpY2F0aW9uX19mb3JtJyk7XG4gICAgY29uc3QgbGlua0J1dHRvbldyYXBwZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubGlua19fYnV0dG9uLXdyYXBwZXInKTtcbiAgICBjb25zdCBzdWJtaXRCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc3VibWl0LWJ1dHRvbicpO1xuXG4gICAgLy9UZXN0IGJ1dHRvbnNcbiAgICBjb25zdCBhdXRob3JpemVkQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmJ1dHRvbi1hdXRob3JpemVkJyk7XG4gICAgY29uc3Qgbm90QXV0aG9yaXplZEJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5idXR0b24tbm90QXV0aG9yaXplZCcpO1xuICAgIGNvbnN0IHN1Y2Nlc3NCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYnV0dG9uLXN1Y2Nlc3MnKTtcbiAgICBjb25zdCBzdWNjZXNzQmVmb3JlQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmJ1dHRvbi1zdWNjZXNzQmVmb3JlJyk7XG5cbiAgICAvL1N0YXRlc1xuICAgIGxldCBhdXRob3JpemVkID0gZmFsc2U7XG4gICAgbGV0IG5vdEF1dGhvcml6ZWQgPSB0cnVlO1xuICAgIGxldCBzdWNjZXNzID0gZmFsc2U7XG4gICAgbGV0IHN1Y2Nlc3NCZWZvcmUgPSBmYWxzZTtcblxuICAgIGFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCclYyBpbml0IGZpcmVkJywgJ2NvbG9yOiAjMDBmZjAwOyBmb250LXdlaWdodDogYm9sZCcpO1xuICAgICAgICBjb25zb2xlLmxvZygnJWMgaW5pdCBmaXJlZCcsICdjb2xvcjogIzAwZmYwMDsgZm9udC13ZWlnaHQ6IGJvbGQnKTtcbiAgICAgICAgLy8gbGV0IHVzZXJQaG9uZU51bWJlciA9IG51bGw7XG4gICAgICAgIC8vIGxldCB1c2VyUGhvbmVWZXJpZmllZCA9IGZhbHNlO1xuXG4gICAgICAgIGNvbnN0IHVwZGF0ZVVJQmFzZWRPblN0YXRlID0gKCkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1VwZGF0aW5nIFVJLCBzdGF0ZXM6Jywge1xuICAgICAgICAgICAgICAgIGF1dGhvcml6ZWQsXG4gICAgICAgICAgICAgICAgbm90QXV0aG9yaXplZCxcbiAgICAgICAgICAgICAgICBzdWNjZXNzQmVmb3JlLFxuICAgICAgICAgICAgICAgIHN1Y2Nlc3MsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1XcmFwcGVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmZvcm1fX3dyYXBwZXInKTtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1Db250YWluZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuZm9ybV9fY29udGFpbmVyJyk7XG4gICAgICAgICAgICBjb25zdCBmb3JtQ29udGFpbmVyU3VjY2Vzc0JlZm9yZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXG4gICAgICAgICAgICAgICAgJy5mb3JtX19jb250YWluZXItc3VjY2Vzc0JlZm9yZSdcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIC8vIFJlc2V0IGFsbCBzdGF0ZXMgZmlyc3RcbiAgICAgICAgICAgIC8vIGZvcm1XcmFwcGVyPy5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nLCAndmlzaWJsZScpO1xuICAgICAgICAgICAgLy8gZm9ybUNvbnRhaW5lcj8uY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJywgJ3Zpc2libGUnKTtcbiAgICAgICAgICAgIC8vIHZlcmlmaWNhdGlvbkZvcm0/LmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicsICd2aXNpYmxlJyk7XG5cbiAgICAgICAgICAgIGlmIChub3RBdXRob3JpemVkKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vdCBhdXRob3JpemVkJyk7XG4gICAgICAgICAgICAgICAgZm9ybVdyYXBwZXI/LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIGxpbmtCdXR0b25XcmFwcGVyPy5jbGFzc0xpc3QuYWRkKCd2aXNpYmxlJyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGF1dGhvcml6ZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnYXV0aG9yaXplZCcpO1xuICAgICAgICAgICAgICAgIGxpbmtCdXR0b25XcmFwcGVyPy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICBsaW5rQnV0dG9uV3JhcHBlcj8uY2xhc3NMaXN0LnJlbW92ZSgndmlzaWJsZScpO1xuXG4gICAgICAgICAgICAgICAgZm9ybVdyYXBwZXI/LmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvbkZvcm0/LmNsYXNzTGlzdC5hZGQoJ3Zpc2libGUnKTtcbiAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25Gb3JtPy5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcblxuICAgICAgICAgICAgfSBlbHNlIGlmIChzdWNjZXNzQmVmb3JlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3N1Y2Nlc3NCZWZvcmUnKTtcbiAgICAgICAgICAgICAgICBmb3JtQ29udGFpbmVyPy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICBmb3JtQ29udGFpbmVyU3VjY2Vzc0JlZm9yZT8uY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgYXV0aG9yaXplZEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnYXV0aG9yaXplZEJ1dHRvbiBjbGlja2VkJyk7XG5cbiAgICAgICAgICAgIGF1dGhvcml6ZWQgPSB0cnVlO1xuICAgICAgICAgICAgbm90QXV0aG9yaXplZCA9IGZhbHNlO1xuICAgICAgICAgICAgc3VjY2VzcyA9IGZhbHNlO1xuICAgICAgICAgICAgc3VjY2Vzc0JlZm9yZSA9IGZhbHNlO1xuICAgICAgICAgICAgdXBkYXRlVUlCYXNlZE9uU3RhdGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbm90QXV0aG9yaXplZEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnbm90QXV0aG9yaXplZEJ1dHRvbiBjbGlja2VkJyk7XG4gICAgICAgICAgICBhdXRob3JpemVkID0gZmFsc2U7XG4gICAgICAgICAgICBub3RBdXRob3JpemVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHN1Y2Nlc3MgPSBmYWxzZTtcbiAgICAgICAgICAgIHN1Y2Nlc3NCZWZvcmUgPSBmYWxzZTtcbiAgICAgICAgICAgIHVwZGF0ZVVJQmFzZWRPblN0YXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIHN1Y2Nlc3NCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAvLyAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAvLyAgICAgdXBkYXRlVUlCYXNlZE9uU3RhdGUoKTtcbiAgICAgICAgLy8gfSk7XG5cbiAgICAgICAgc3VjY2Vzc0JlZm9yZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc3VjY2Vzc0JlZm9yZUJ1dHRvbiBjbGlja2VkJyk7XG4gICAgICAgICAgICBhdXRob3JpemVkID0gZmFsc2U7XG4gICAgICAgICAgICBub3RBdXRob3JpemVkID0gZmFsc2U7XG4gICAgICAgICAgICBzdWNjZXNzID0gZmFsc2U7XG4gICAgICAgICAgICBzdWNjZXNzQmVmb3JlID0gdHJ1ZTtcbiAgICAgICAgICAgIHVwZGF0ZVVJQmFzZWRPblN0YXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWwgVUkgdXBkYXRlXG4gICAgICAgIHVwZGF0ZVVJQmFzZWRPblN0YXRlKCk7XG5cbiAgICAgICAgLy8gaWYgKHdpbmRvdy5GRT8udXNlci5yb2xlID09PSAnZ3Vlc3QnKSB7XG4gICAgICAgIC8vICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuZm9ybV9fd3JhcHBlcicpLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgICAgICAvLyAgICAgbGlua0J1dHRvbldyYXBwZXIuY2xhc3NMaXN0LmFkZCgndmlzaWJsZScpO1xuICAgICAgICAvLyAgICAgbGlua0J1dHRvbldyYXBwZXIuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG5cbiAgICAgICAgLy8gICAgIHJldHVybjtcbiAgICAgICAgLy8gfSBlbHNlIHtcbiAgICAgICAgLy8gICAgIHZlcmlmaWNhdGlvbkZvcm0uY2xhc3NMaXN0LmFkZCgndmlzaWJsZScpO1xuICAgICAgICAvLyAgICAgdmVyaWZpY2F0aW9uRm9ybS5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICAgICAgLy8gfVxuXG4gICAgICAgIGNvbnN0IGNvbmZpcm1hdGlvbkZvcm0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29uZmlybWF0aW9uX19mb3JtJyk7XG4gICAgICAgIGNvbnN0IGNvbmZpcm1CdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29uZmlybS1idXR0b24nKTtcblxuICAgICAgICBsZXQgdmVyaWZpY2F0aW9uU2Vzc2lvbiA9IG51bGw7XG4gICAgICAgIGxldCB2ZXJpZmljYXRpb25UaW1lciA9IG51bGw7XG4gICAgICAgIGxldCB1c2VyID0gbnVsbDtcbiAgICAgICAgbGV0IGNpZCA9IG51bGw7XG5cbiAgICAgICAgbGV0IHN1Ym1pdHRlZFBob25lID0gbnVsbDtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gdXNlciA9IGF3YWl0IGdldFVzZXIoKTtcbiAgICAgICAgICAgIC8vIGNpZCA9IHVzZXIuY2lkO1xuICAgICAgICAgICAgLy8gdXNlclBob25lTnVtYmVyID0gdXNlci5kYXRhLmFjY291bnQucGhvbmVfbnVtYmVyO1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ3VzZXJQaG9uZU51bWJlcjonLCB1c2VyUGhvbmVOdW1iZXIpO1xuICAgICAgICAgICAgLy8gdXNlclBob25lVmVyaWZpZWQgPSB1c2VyLmRhdGEuYWNjb3VudC5hY2NvdW50X3N0YXR1cy5maW5kKFxuICAgICAgICAgICAgLy8gICAgIChzdGF0dXMpID0+IHN0YXR1cy5hbGlhcyA9PT0gJ0lTX1BIT05FX1ZFUklGSUVEJ1xuICAgICAgICAgICAgLy8gKS52YWx1ZTtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCd1c2VyUGhvbmVWZXJpZmllZDonLCB1c2VyUGhvbmVWZXJpZmllZCk7XG4gICAgICAgICAgICAvLyB1c2VyUGhvbmVOdW1iZXIgPSB0cnVlO1xuICAgICAgICAgICAgLy8gdXNlclBob25lVmVyaWZpZWQgPSB0cnVlO1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdXNlciBoYXMgYSBudW1iZXIgYW5kIGlzIGFscmVhZHkgdmVyaWZpZWRcbiAgICAgICAgICAgIC8vIGlmICh1c2VyUGhvbmVOdW1iZXIgJiYgdXNlclBob25lVmVyaWZpZWQpIHtcbiAgICAgICAgICAgIC8vICAgICBkb2N1bWVudFxuICAgICAgICAgICAgLy8gICAgICAgICAucXVlcnlTZWxlY3RvcignLmZvcm1fX2NvbnRhaW5lcicpXG4gICAgICAgICAgICAvLyAgICAgICAgIC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIC8vICAgICBkb2N1bWVudFxuICAgICAgICAgICAgLy8gICAgICAgICAucXVlcnlTZWxlY3RvcignLmZvcm1fX2NvbnRhaW5lci1zdWNjZXNzQmVmb3JlJylcbiAgICAgICAgICAgIC8vICAgICAgICAgLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuXG4gICAgICAgICAgICAvLyAgICAgcmV0dXJuO1xuICAgICAgICAgICAgLy8gfVxuXG4gICAgICAgICAgICAvLyB2ZXJpZmljYXRpb25Gb3JtLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuICAgICAgICAgICAgLy8gdmVyaWZpY2F0aW9uRm9ybS5jbGFzc0xpc3QuYWRkKCd2aXNpYmxlJyk7XG4gICAgICAgICAgICAvLyBwaG9uZUlucHV0LnZhbHVlID0gYCske3VzZXJQaG9uZU51bWJlcn1gO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGdldCB1c2VyOicsIGVycm9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN0YXJ0VmVyaWZpY2F0aW9uVGltZXIgPSAoXG4gICAgICAgICAgICB0b3RhbFNlY29uZHMsXG4gICAgICAgICAgICB7IGNvbmZpcm1hdGlvbiA9IGZhbHNlLCB2ZXJpZmljYXRpb24gPSBmYWxzZSB9XG4gICAgICAgICkgPT4ge1xuICAgICAgICAgICAgY29uZmlybUJ1dHRvbi50ZXh0Q29udGVudCA9ICfQndCQ0JTQhtCh0JvQkNCi0JgnO1xuICAgICAgICAgICAgY29uZmlybUJ1dHRvbi5zZXRBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgICAgJ2RhdGEtdHJhbnNsYXRlJyxcbiAgICAgICAgICAgICAgICAnc2VuZENvbmZpcm1hdGlvbkNvZGUnXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICBpZiAodmVyaWZpY2F0aW9uVGltZXIpIHtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHZlcmlmaWNhdGlvblRpbWVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IHRpbWVMZWZ0ID0gdG90YWxTZWNvbmRzO1xuXG4gICAgICAgICAgICB2ZXJpZmljYXRpb25UaW1lciA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGltZUxlZnQgPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHZlcmlmaWNhdGlvblRpbWVyKTtcblxuICAgICAgICAgICAgICAgICAgICBjb25maXJtQnV0dG9uLmRpc2FibGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpcm1CdXR0b24udGV4dENvbnRlbnQgPSAn0J3QkNCU0IbQodCb0JDQotCYINCf0J7QktCi0J7QoNCd0J4nO1xuICAgICAgICAgICAgICAgICAgICBjb25maXJtQnV0dG9uLnNldEF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgICAgICAgICAgICdkYXRhLXRyYW5zbGF0ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAncmVzZW5kQ29uZmlybWF0aW9uQ29kZSdcbiAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgICAgICByZW1vdmVFeGlzdGluZ01lc3NhZ2VzKHZlcmlmaWNhdGlvbkZvcm0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlc2V0IHRoZSBmb3JtIGFuZCByZW1vdmUgcmVxdWlyZWQgYXR0cmlidXRlXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvZGVJbnB1dCA9XG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29uZmlybWF0aW9uLWNvZGUnKTtcbiAgICAgICAgICAgICAgICAgICAgY29kZUlucHV0LnZhbHVlID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIGNvZGVJbnB1dC5yZXF1aXJlZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIENoYW5nZSBmb3JtIHN1Ym1pdCBiZWhhdmlvciB0byB2ZXJpZmljYXRpb24gYW5kIHRyaWdnZXIgY2xlYW51cFxuICAgICAgICAgICAgICAgICAgICBjb25maXJtYXRpb25Gb3JtLmRhdGFzZXQuY29uZmlybWF0aW9uRXhwaXJlZCA9ICd0cnVlJztcblxuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IG1lc3NhZ2UgYWJvdXQgZXhwaXJlZCBjb2RlIChjbGVhbnVwIHdpbGwgaGFwcGVuIGluIHNob3dJbnB1dE1lc3NhZ2UpXG4gICAgICAgICAgICAgICAgICAgIHNob3dJbnB1dE1lc3NhZ2UoXG4gICAgICAgICAgICAgICAgICAgICAgICBFUlJPUl9NRVNTQUdFUy5WRVJJRklDQVRJT05fRVhQSVJFRC5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlybWF0aW9uRm9ybSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdlcnJvcidcbiAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgbWludXRlcyA9IE1hdGguZmxvb3IodGltZUxlZnQgLyA2MCk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2Vjb25kcyA9IHRpbWVMZWZ0ICUgNjA7XG5cbiAgICAgICAgICAgICAgICBpZiAodmVyaWZpY2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHNob3dJbnB1dE1lc3NhZ2UoXG4gICAgICAgICAgICAgICAgICAgICAgICBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYCR7TWF0aC5mbG9vcih0aW1lTGVmdCAvIDM2MDApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50b1N0cmluZygpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5wYWRTdGFydCgyLCAnMCcpfToke01hdGguZmxvb3IoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh0aW1lTGVmdCAlIDM2MDApIC8gNjBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50b1N0cmluZygpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5wYWRTdGFydCgyLCAnMCcpfTokeyh0aW1lTGVmdCAlIDYwKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAudG9TdHJpbmcoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucGFkU3RhcnQoMiwgJzAnKX1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVSUk9SX01FU1NBR0VTLlZFUklGSUNBVElPTl9MT0NLRUQubWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25Gb3JtLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2Vycm9yJ1xuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChjb25maXJtYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgc2hvd0lucHV0TWVzc2FnZShcbiAgICAgICAgICAgICAgICAgICAgICAgIFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBgJHttaW51dGVzLnRvU3RyaW5nKCkucGFkU3RhcnQoMiwgJzAnKX06JHtzZWNvbmRzLnRvU3RyaW5nKCkucGFkU3RhcnQoMiwgJzAnKX1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVSUk9SX01FU1NBR0VTLlNNU19DT0RFX1RJTUVSLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlybWF0aW9uRm9ybSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZhbHNlXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRpbWVMZWZ0LS07XG4gICAgICAgICAgICB9LCAxMDAwKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBoYW5kbGVWZXJpZmljYXRpb25SZXNwb25zZSA9IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgICAgJ3Jlc3BvbnNlIGZyb20gdmVyaWZ5VXNlclBob25lIGluc2lkZSBoYW5kbGVWZXJpZmljYXRpb25SZXNwb25zZScsXG4gICAgICAgICAgICAgICAgcmVzcG9uc2VcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBjb25zdCBzdGVwID0ge1xuICAgICAgICAgICAgICAgIGNvbmZpcm1hdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgdmVyaWZpY2F0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAocmVzcG9uc2Uub2spIHtcbiAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25TZXNzaW9uID0gcmVzcG9uc2UuZGF0YS5zZXNzaW9uX2lkO1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgaGFuZGxlIGZvcm0gdmlzaWJpbGl0eSBpZiBpdCdzIGhpZGRlblxuICAgICAgICAgICAgICAgIGlmIChjb25maXJtYXRpb25Gb3JtLmNsYXNzTGlzdC5jb250YWlucygnaGlkZGVuJykpIHtcbiAgICAgICAgICAgICAgICAgICAgdmVyaWZpY2F0aW9uRm9ybS5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICAgICAgdmVyaWZpY2F0aW9uRm9ybS5jbGFzc0xpc3QucmVtb3ZlKCd2aXNpYmxlJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpcm1hdGlvbkZvcm0uY2xhc3NMaXN0LmFkZCgndmlzaWJsZScpO1xuICAgICAgICAgICAgICAgICAgICBjb25maXJtYXRpb25Gb3JtLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHN0ZXAuY29uZmlybWF0aW9uID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAvLyBTdGFydCB0aW1lciBmb3IgY29kZSB2ZXJpZmljYXRpb25cbiAgICAgICAgICAgICAgICBjb25zdCB0dGwgPSByZXNwb25zZS5kYXRhLnBob25lX3ZlcmlmaWNhdGlvbl90dGw7XG4gICAgICAgICAgICAgICAgc3RhcnRWZXJpZmljYXRpb25UaW1lcih0dGwsIHN0ZXApO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgICAgICByZXNwb25zZS5jb2RlID09PSAtMjQgJiZcbiAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlLnJlYXNvbiA9PT0gJ3ZlcmlmaWNhdGlvbl9sb2NrZWQnXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IHJlc3RfdGltZSB9ID0gcmVzcG9uc2UubWVzc2FnZTtcbiAgICAgICAgICAgICAgICBzdWJtaXRCdXR0b24uZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHBob25lSW5wdXQuZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHN0ZXAudmVyaWZpY2F0aW9uID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBzdGFydFZlcmlmaWNhdGlvblRpbWVyKHJlc3RfdGltZSwgc3RlcCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgICAgICAgIHJlc3BvbnNlLmNvZGUgPT09IC0yNCAmJlxuICAgICAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2UucmVhc29uID09PVxuICAgICAgICAgICAgICAgICAgICAncGhvbmVfbnVtYmVyX2hhc19iZWVuX2NvbmZpcm1lZF9ieV9hbm90aGVyX3VzZXInXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICBzdWJtaXRCdXR0b24uZGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBzaG93SW5wdXRNZXNzYWdlKFxuICAgICAgICAgICAgICAgICAgICBFUlJPUl9NRVNTQUdFUy5QSE9ORV9DT05GSVJNRURfQllfQU5PVEhFUi5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25Gb3JtLFxuICAgICAgICAgICAgICAgICAgICAnZXJyb3InXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvL1VzZXIgc3RhcnRzIHRvIGNoYW5nZSBwaG9uZSBudW1iZXJcbiAgICAgICAgcGhvbmVJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGUudGFyZ2V0LnZhbHVlO1xuICAgICAgICAgICAgLy8gUmVtb3ZlIGlzLWludmFsaWQgY2xhc3MgaW5pdGlhbGx5XG4gICAgICAgICAgICBwaG9uZUlucHV0LmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWludmFsaWQnKTtcbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIHBob25lIG51bWJlclxuICAgICAgICAgICAgaWYgKCFpc1Bob25lVmFsaWQodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcGhvbmVJbnB1dC5jbGFzc0xpc3QuYWRkKCdpcy1pbnZhbGlkJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlbW92ZUV4aXN0aW5nTWVzc2FnZXModmVyaWZpY2F0aW9uRm9ybSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZS50YXJnZXQudmFsdWUuc2xpY2UoMSkgPT09IHVzZXJQaG9uZU51bWJlcikge1xuICAgICAgICAgICAgICAgIHN1Ym1pdEJ1dHRvbi5pbm5lckhUTUwgPSAn0J/QhtCU0KLQktCV0KDQlNCY0KLQmCc7XG4gICAgICAgICAgICAgICAgc3VibWl0QnV0dG9uLnNldEF0dHJpYnV0ZSgnZGF0YS10cmFuc2xhdGUnLCAnY29uZmlybScpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdWJtaXRCdXR0b24uaW5uZXJIVE1MID0gJ9CX0JHQldCg0JXQk9Ci0JgnO1xuICAgICAgICAgICAgICAgIHN1Ym1pdEJ1dHRvbi5zZXRBdHRyaWJ1dGUoJ2RhdGEtdHJhbnNsYXRlJywgJ3NhdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uZmlybWF0aW9uQ29kZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIFJlbW92ZSBub24tbnVtZXJpYyBjaGFyYWN0ZXJzXG4gICAgICAgICAgICBlLnRhcmdldC52YWx1ZSA9IGUudGFyZ2V0LnZhbHVlLnJlcGxhY2UoL1teMC05XS9nLCAnJyk7XG5cbiAgICAgICAgICAgIC8vIEFkZC9yZW1vdmUgLmlzLWludmFsaWQgY2xhc3MgYmFzZWQgb24gdmFsaWRhdGlvblxuICAgICAgICAgICAgaWYgKGUudGFyZ2V0LnZhbHVlLmxlbmd0aCAhPT0gNSkge1xuICAgICAgICAgICAgICAgIGUudGFyZ2V0LmNsYXNzTGlzdC5hZGQoJ2lzLWludmFsaWQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZS50YXJnZXQuY2xhc3NMaXN0LnJlbW92ZSgnaXMtaW52YWxpZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBVc2VyIHN1Ym1pdHMgdmVyaWZpY2F0aW9uIGZvcm1cbiAgICAgICAgdmVyaWZpY2F0aW9uRm9ybS5hZGRFdmVudExpc3RlbmVyKCdzdWJtaXQnLCBhc3luYyAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgICAgJyVjIEZvcm0gc3VibWl0dGVkJyxcbiAgICAgICAgICAgICAgICAnY29sb3I6ICNmZjAwZmY7IGZvbnQtd2VpZ2h0OiBib2xkJyxcbiAgICAgICAgICAgICAgICBlXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgc3VibWl0QnV0dG9uLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHN1Ym1pdHRlZFBob25lID0gZS50YXJnZXRbMF0udmFsdWU7XG5cbiAgICAgICAgICAgIGlmICghaXNQaG9uZVZhbGlkKHN1Ym1pdHRlZFBob25lKSkge1xuICAgICAgICAgICAgICAgIHNob3dJbnB1dE1lc3NhZ2UoXG4gICAgICAgICAgICAgICAgICAgIEVSUk9SX01FU1NBR0VTLklOVkFMSURfUEhPTkVfRk9STUFULm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvbkZvcm0sXG4gICAgICAgICAgICAgICAgICAgICdlcnJvcidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIHN1Ym1pdEJ1dHRvbi5kaXNhYmxlZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZW1vdmVFeGlzdGluZ01lc3NhZ2VzKHZlcmlmaWNhdGlvbkZvcm0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVzZXJJZCA9IHVzZXIuZGF0YS5hY2NvdW50LmlkO1xuICAgICAgICAgICAgICAgIGNvbnN0IHVzZXJEYXRhID0gbmV3IEZvcm1EYXRhKCk7XG5cbiAgICAgICAgICAgICAgICB1c2VyRGF0YS5hcHBlbmQoJ3Bob25lJywgc3VibWl0dGVkUGhvbmUpO1xuICAgICAgICAgICAgICAgIHVzZXJEYXRhLmFwcGVuZCgndXNlcmlkJywgdXNlcklkKTtcblxuICAgICAgICAgICAgICAgIC8vQ2hhbmdlIHVzZXIgcGhvbmUgbnVtYmVyXG4gICAgICAgICAgICAgICAgaWYgKHN1Ym1pdHRlZFBob25lICE9PSBgKyR7dXNlclBob25lTnVtYmVyfWApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1RSWSBDSEFOR0UgVVNFUiBQSE9ORS0tLVZFUklGIEZPUk0nKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBjaGFuZ2VVc2VyUGhvbmUodXNlckRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5lcnJvciA9PT0gJ25vJyAmJiAhcmVzcG9uc2UuZXJyb3JfY29kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlRXhpc3RpbmdNZXNzYWdlcyh2ZXJpZmljYXRpb25Gb3JtKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdXNlclBob25lTnVtYmVyID0gcmVzcG9uc2UucGhvbmUuc2xpY2UoMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWJtaXRCdXR0b24uaW5uZXJIVE1MID0gJ9Cf0IbQlNCi0JLQldCg0JTQmNCi0JgnO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VibWl0QnV0dG9uLmRpc2FibGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5lcnJvciA9PT0gJ3llcycgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmVycm9yX2NvZGUgPT09ICdhY2NvdW50aW5nX2Vycm9yXzAyJ1xuICAgICAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Ym1pdEJ1dHRvbi5kaXNhYmxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvd0lucHV0TWVzc2FnZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBFUlJPUl9NRVNTQUdFUy5QSE9ORV9BTFJFQURZX1VTRUQubWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25Gb3JtLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdlcnJvcidcbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vVmVyaWZ5IHVzZXIgcGhvbmUgbnVtYmVyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1RSWSBWRVJJRlkgVVNFUiBQSE9ORS0tLVZFUklGIEZPUk0nKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHZlcmlmeVVzZXJQaG9uZShjaWQpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZVZlcmlmaWNhdGlvblJlc3BvbnNlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyByZXNwb25zZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1ZlcmlmaWNhdGlvbiBwcm9jZXNzIGZhaWxlZDonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgc3VibWl0QnV0dG9uLmRpc2FibGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBjb25maXJtYXRpb24gZm9ybSBoYW5kbGVyXG4gICAgICAgIGNvbmZpcm1hdGlvbkZvcm0uYWRkRXZlbnRMaXN0ZW5lcignc3VibWl0JywgYXN5bmMgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbmZpcm1CdXR0b24uZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3N1Ym1pdHRlciBwaG9uZScsIHN1Ym1pdHRlZFBob25lKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdmVyaWZpY2F0aW9uIGhhcyBleHBpcmVkXG4gICAgICAgICAgICBpZiAoY29uZmlybWF0aW9uRm9ybS5kYXRhc2V0LmNvbmZpcm1hdGlvbkV4cGlyZWQgPT09ICd0cnVlJykge1xuICAgICAgICAgICAgICAgIC8vIFJlc2V0IHRoZSBmb3JtIHN0YXRlXG4gICAgICAgICAgICAgICAgY29uZmlybWF0aW9uRm9ybS5kYXRhc2V0LmNvbmZpcm1hdGlvbkV4cGlyZWQgPSAnZmFsc2UnO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvZGVJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb25maXJtYXRpb24tY29kZScpO1xuICAgICAgICAgICAgICAgIGNvZGVJbnB1dC5yZXF1aXJlZCA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIG5ldyB2ZXJpZmljYXRpb25cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVFJZIFZFUklGWSBVU0VSIFBIT05FLS0tQ09ORiBGT1JNJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdmVyaWZ5VXNlclBob25lKGNpZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlVmVyaWZpY2F0aW9uUmVzcG9uc2UocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgcmVzZW5kaW5nIHZlcmlmaWNhdGlvbiBjb2RlOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uZmlybUJ1dHRvbi5kaXNhYmxlZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBjb2RlID0gY29uZmlybWF0aW9uQ29kZUlucHV0LnZhbHVlO1xuXG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSBsZW5ndGggYW5kIG51bWVyaWNcbiAgICAgICAgICAgIGlmICghL15cXGR7NX0kLy50ZXN0KGNvZGUpKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2luc2lkZSB2YWxpZGF0ZSBmbigpIC0tLWNvZGUgaXMgaW52YWxpZCcpO1xuICAgICAgICAgICAgICAgIGNvbmZpcm1hdGlvbkNvZGVJbnB1dC5jbGFzc0xpc3QuYWRkKCdpcy1pbnZhbGlkJyk7XG4gICAgICAgICAgICAgICAgY29uZmlybUJ1dHRvbi5kaXNhYmxlZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdUUlkgQ09ORklSTSBVU0VSIFBIT05FLS0tQ09ORiBGT1JNJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBjb25maXJtVXNlclBob25lKFxuICAgICAgICAgICAgICAgICAgICBjb2RlLFxuICAgICAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25TZXNzaW9uXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuZm9ybV9fd3JhcHBlcicpLnN0eWxlLmRpc3BsYXkgPVxuICAgICAgICAgICAgICAgICAgICAgICAgJ25vbmUnO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBoZWFkZXIgdGV4dCBhbmQgZGF0YS10cmFuc2xhdGVcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmZvcm1fX2hlYWRlcicpO1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXIudGV4dENvbnRlbnQgPSAn0KLQktCG0Jkg0J3QntCc0JXQoCDQktCV0KDQmNCk0IbQmtCe0JLQkNCd0J4nO1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXIuc2V0QXR0cmlidXRlKCdkYXRhLXRyYW5zbGF0ZScsICdmb3JtSGVhZGVyU3VjY2VzcycpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBkZXNjcmlwdGlvbiB0ZXh0IGFuZCBkYXRhLXRyYW5zbGF0ZVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkZXNjcmlwdGlvbiA9XG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuZm9ybV9fZGVzY3JpcHRpb24nKTtcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb24udGV4dENvbnRlbnQgPVxuICAgICAgICAgICAgICAgICAgICAgICAgJ9CS0LDRiCDQv9C10YDRgdC+0L3QsNC70YzQvdC40Lkg0LHQvtC90YPRgSDQt9Cw0YDQsNGF0L7QstCw0L3QviDQsiDRgNC+0LfQtNGW0LsgXCLQkdC+0L3Rg9GB0LhcIic7XG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uLnNldEF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgICAgICAgICAgICdkYXRhLXRyYW5zbGF0ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAnZm9ybURlc2NyaXB0aW9uU3VjY2VzcydcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3VjY2Vzc0ltYWdlV3JhcHBlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXG4gICAgICAgICAgICAgICAgICAgICAgICAnLnN1Y2Nlc3NJbWFnZVdyYXBwZXInXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NJbWFnZVdyYXBwZXIuY2xhc3NMaXN0LmFkZCgndmlzaWJsZScpO1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzSW1hZ2VXcmFwcGVyLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBmaXJzdCBkaXZcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlyc3REaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICAgICAgZmlyc3REaXYuY2xhc3NOYW1lID0gJ3N1Y2Nlc3NJbWFnZVdyYXBwZXItcHJpemVJbmZvJztcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaXJzdFNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICAgICAgICAgIGZpcnN0U3Bhbi50ZXh0Q29udGVudCA9ICfQodCi0KDQkNCl0J7QktCa0JAg0JTQnic7XG4gICAgICAgICAgICAgICAgICAgIGZpcnN0U3Bhbi5zZXRBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAnZGF0YS10cmFuc2xhdGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ3ByaXplSW5mb0luc3VyYW5jZSdcbiAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWNvbmRTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgICAgICAgICBzZWNvbmRTcGFuLnRleHRDb250ZW50ID0gJ9Ch0KLQkNCS0JrQmCAxMDAg4oK0JztcbiAgICAgICAgICAgICAgICAgICAgc2Vjb25kU3Bhbi5zZXRBdHRyaWJ1dGUoJ2RhdGEtdHJhbnNsYXRlJywgJ3ByaXplSW5mb1ZhbHVlJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQXBwZW5kIHNwYW5zIHRvIGZpcnN0IGRpdlxuICAgICAgICAgICAgICAgICAgICBmaXJzdERpdi5hcHBlbmRDaGlsZChmaXJzdFNwYW4pO1xuICAgICAgICAgICAgICAgICAgICBmaXJzdERpdi5hcHBlbmRDaGlsZChzZWNvbmRTcGFuKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgc2Vjb25kIGRpdlxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWNvbmREaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICAgICAgc2Vjb25kRGl2LmNsYXNzTmFtZSA9ICdzdWNjZXNzSW1hZ2VXcmFwcGVyLWJvbnVzU3BhcmsnO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEFwcGVuZCBkaXZzIHRvIGNvbnRhaW5lclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzSW1hZ2VXcmFwcGVyLmFwcGVuZENoaWxkKGZpcnN0RGl2KTtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc0ltYWdlV3JhcHBlci5hcHBlbmRDaGlsZChzZWNvbmREaXYpO1xuXG4gICAgICAgICAgICAgICAgICAgIGxpbmtCdXR0b25XcmFwcGVyLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxpbmtCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFxuICAgICAgICAgICAgICAgICAgICAgICAgJy5saW5rX19idXR0b24td3JhcHBlciBhJ1xuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBsaW5rQnV0dG9uLmhyZWYgPSAnL3BlcnNvbmFsLW9mZmljZS9ib251c2VzL2JldGluc3VyYW5jZSc7XG4gICAgICAgICAgICAgICAgICAgIGxpbmtCdXR0b24udGV4dENvbnRlbnQgPSAn0JTQniDQkdCe0J3Qo9Ch0KMnO1xuICAgICAgICAgICAgICAgICAgICBsaW5rQnV0dG9uLnNldEF0dHJpYnV0ZSgnZGF0YS10cmFuc2xhdGUnLCAnY29uZmlybVN1Y2Nlc3MnKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyEgQWRkIHZlcmlmaWNhdGlvbiByZWNvcmRcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdXNlcklkID0gdXNlci5kYXRhLmFjY291bnQuaWQ7XG5cbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgYWRkVmVyaWZpY2F0aW9uKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZXJpZDogdXNlcklkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGhvbmU6IHN1Ym1pdHRlZFBob25lLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGNvbmZpcm1pbmcgY29kZTonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgICAgICBlcnJvci5jb2RlID09PSAtNCAmJlxuICAgICAgICAgICAgICAgICAgICBlcnJvci5tZXNzYWdlLnJlYXNvbiA9PT0gJ3dyb25nX3Nlc3Npb25fb3JfY29uZmlybV9jb2RlJ1xuICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICBzaG93SW5wdXRNZXNzYWdlKFxuICAgICAgICAgICAgICAgICAgICAgICAgRVJST1JfTUVTU0FHRVMuSU5WQUxJRF9DT05GSVJNQVRJT05fQ09ERS5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlybWF0aW9uRm9ybSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdlcnJvcidcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIGNvbmZpcm1CdXR0b24uZGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gbG9hZFRyYW5zbGF0aW9ucygpLnRoZW4oaW5pdCk7XG4gICAgaW5pdCgpO1xuXG4gICAgLy8gY29uc3QgbWFpblBhZ2UgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuZmF2X19wYWdlJyk7XG4gICAgLy8gc2V0VGltZW91dCgoKSA9PiBtYWluUGFnZS5jbGFzc0xpc3QuYWRkKCdvdmVyZmxvdycpLCAxMDAwKTtcbn0pKCk7XG4iXX0=
