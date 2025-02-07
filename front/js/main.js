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
    const FORMS = {
        CONFIRMATION: 'confirmation',
        VERIFICATION: 'verification',
    };
    const API = 'https://fav-prom.com';
    const ENDPOINT = 'api_verification';

    // #region Translation
    const ukLeng = document.querySelector('#ukLeng');
    const enLeng = document.querySelector('#enLeng');
    let i18nData = {};
    let locale = 'uk';
    if (ukLeng) locale = 'uk';
    if (enLeng) locale = 'en';

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

    let dayLock = false;

    function showInputMessage(message, targetElement, state = false) {
        const inputElement = targetElement.querySelector('input');
        const buttonElement = targetElement.querySelector('button');
        document
            .getElementById('confirmation__form')
            .setAttribute('data-placeholder', '');
        // Find error message object if it exists
        let errorObj = null;
        for (const key in ERROR_MESSAGES) {
            if (ERROR_MESSAGES[key].message === message) {
                errorObj = ERROR_MESSAGES[key];
                break;
            }
        }
        const existingMessages = targetElement.querySelectorAll('.input-msg');
        const isTimerMessage = Array.isArray(message) && message.length === 2;
        // Check for existing messages with the same content
        for (const msg of existingMessages) {
            // Handle timer message replacement
            if (isTimerMessage) {
                const timerWrapper = msg.querySelector('.timerWrapper');
                if (timerWrapper) {
                    // If this is a new timer message and we found an existing timer
                    const timer = timerWrapper.querySelector('.timer');
                    if (timer) {
                        timer.textContent = message[0];
                        return; // Exit after updating existing timer
                    }
                }
                // Don't remove timer message if it exists and we're showing a different message
                continue;
            } else if (msg.textContent === message) {
                return; // Exit if non-timer message already exists
            }
            // Remove non-timer messages or old timer messages if we're showing a new timer
            if (!msg.querySelector('.timerWrapper') || isTimerMessage) {
                msg.remove();
            }
        }

        // Create new message element
        const messageElement = document.createElement('div');
        messageElement.classList.add('input-msg');

        if (isTimerMessage) {
            // Create timer wrapper structure
            const timerWrapper = document.createElement('div');
            timerWrapper.classList.add('timerWrapper');
            // Set min-width based on lock type
            timerWrapper.style.minWidth = dayLock ? '63px' : '45px';
            // Create and setup timer element
            const timerElement = document.createElement('span');
            timerElement.textContent = message[0];
            timerElement.classList.add('timer');
            timerWrapper.appendChild(timerElement);
            // Create and setup message element
            const messageText = document.createElement('span');
            messageText.textContent = message[1];
            messageText.classList.add(state ? 'error' : 'warning');
            // Handle translation keys
            if (message[1] === ERROR_MESSAGES.VERIFICATION_LOCKED.message) {
                messageText.setAttribute(
                    'data-translate',
                    ERROR_MESSAGES.VERIFICATION_LOCKED.translateKey
                );
            } else if (message[1] === ERROR_MESSAGES.SMS_CODE_TIMER.message) {
                messageText.setAttribute(
                    'data-translate',
                    ERROR_MESSAGES.SMS_CODE_TIMER.translateKey
                );
            }
            // Assemble the message structure
            messageElement.appendChild(timerWrapper);
            messageElement.appendChild(document.createTextNode(' '));
            messageElement.appendChild(messageText);
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
        if (message === ERROR_MESSAGES.INVALID_CONFIRMATION_CODE.message) {
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

    const phoneInput = document.getElementById('phone');
    const confirmationCodeInput = document.getElementById('confirmation-code');
    const verificationForm = document.getElementById('verification__form');
    const confirmationForm = document.getElementById('confirmation__form');
    const linkButtonWrapper = document.querySelector('.link__button-wrapper');
    const submitButton = document.getElementById('submit-button');
    const confirmButton = document.getElementById('confirm-button');
    const formWrapper = document.querySelector('.form__wrapper');
    const defaultFormContainer = document.querySelector('.form__container');
    const formContainerSuccessBefore = document.querySelector(
        '.form__container-successBefore'
    );
    const formContainerSuccess = document.querySelector(
        '.form__container-success'
    );

    async function init() {
        console.log('%c init() fired', 'color: #00ff00; font-weight: bold');

        if (window.FE?.user.role === 'guest') {
            formWrapper.classList.add('hidden');
            linkButtonWrapper.classList.add('visible');
            linkButtonWrapper.classList.remove('hidden');

            return;
        }

        let userPhoneNumber = null;
        let userPhoneVerified = false;
        let verificationSession = null;
        let user = null;
        let cid = null;
        let verificationTimer = null;
        let submittedPhone = null;

        const step = {
            confirmation: false,
            verification: false,
        };

        try {
            user = await getUser();
            cid = user.cid;
            userPhoneNumber = user.data.account.phone_number;
            userPhoneVerified = user.data.account.account_status.find(
                (status) => status.alias === 'IS_PHONE_VERIFIED'
            ).value;

            console.log('userPhoneNumber:', userPhoneNumber);
            console.log('userPhoneVerified:', userPhoneVerified);
            //Check if user has a number and is already verified
            if (userPhoneNumber && userPhoneVerified) {
                defaultFormContainer.classList.add('hidden');
                formContainerSuccessBefore.classList.remove('hidden');

                return;
            }

            verificationForm.classList.add('visible');
            verificationForm.classList.remove('hidden');
            phoneInput.value = `+${userPhoneNumber}`;
        } catch (error) {
            console.error('Failed to get user:', error);
        }

        const startVerificationTimer = (totalSeconds, form) => {
            if (form === FORMS.CONFIRMATION) {
                confirmButton.disabled = true;
                confirmButton.textContent = 'НАДІСЛАТИ';
                confirmButton.setAttribute(
                    'data-translate',
                    'sendConfirmationCode'
                );
            }

            if (verificationTimer) {
                clearInterval(verificationTimer);
            }

            let timeLeft = totalSeconds;
            dayLock = totalSeconds > 300;
            let message = '';

            if (dayLock) {
                message = [
                    `${Math.floor(timeLeft / 3600)
                        .toString()
                        .padStart(2, '0')}:${Math.floor((timeLeft % 3600) / 60)
                        .toString()
                        .padStart(2, '0')}:${(timeLeft % 60)
                        .toString()
                        .padStart(2, '0')}`,
                    ERROR_MESSAGES.VERIFICATION_LOCKED.message,
                ];
            } else if (!dayLock && step.verification) {
                message = [
                    `${Math.floor(timeLeft / 60)
                        .toString()
                        .padStart(2, '0')}:${(timeLeft % 60)
                        .toString()
                        .padStart(2, '0')}`,
                    ERROR_MESSAGES.VERIFICATION_LOCKED.message,
                ];
            } else if (!dayLock) {
                message = [
                    `${Math.floor(timeLeft / 60)
                        .toString()
                        .padStart(2, '0')}:${(timeLeft % 60)
                        .toString()
                        .padStart(2, '0')}`,
                    ERROR_MESSAGES.SMS_CODE_TIMER.message,
                ];
            }

            const targetForm =
                form === FORMS.VERIFICATION
                    ? verificationForm
                    : confirmationForm;

            showInputMessage(
                message,
                targetForm,
                dayLock || (!dayLock && step.verification) ? 'error' : false
            );

            const timerElement = targetForm.querySelector('.timer');

            verificationTimer = setInterval(() => {
                if (timeLeft <= 0) {
                    clearInterval(verificationTimer);

                    if (step.verification) {
                        submitButton.disabled = false;
                        removeExistingMessages(verificationForm);
                    } else {
                        confirmButton.disabled = false;
                        confirmButton.textContent = 'НАДІСЛАТИ ПОВТОРНО';
                        confirmButton.setAttribute(
                            'data-translate',
                            'resendConfirmationCode'
                        );
                        confirmationCodeInput.setAttribute('required', false);
                        confirmationCodeInput.value = '';
                        confirmationForm.dataset.confirmationExpired = 'true';
                        removeExistingMessages(confirmationForm);
                        showInputMessage(
                            ERROR_MESSAGES.VERIFICATION_EXPIRED.message,
                            confirmationForm,
                            'error'
                        );
                    }

                    return;
                }

                //Updating timer values for every second
                if (timerElement) {
                    if (dayLock) {
                        timerElement.textContent = `${Math.floor(
                            timeLeft / 3600
                        )
                            .toString()
                            .padStart(2, '0')}:${Math.floor(
                            (timeLeft % 3600) / 60
                        )
                            .toString()
                            .padStart(2, '0')}:${(timeLeft % 60)
                            .toString()
                            .padStart(2, '0')}`;
                    } else {
                        timerElement.textContent = `${Math.floor(timeLeft / 60)
                            .toString()
                            .padStart(2, '0')}:${(timeLeft % 60)
                            .toString()
                            .padStart(2, '0')}`;
                    }
                }

                timeLeft--;
            }, 1000);
        };

        const handleVerificationResponse = (response) => {
            // Clean up expired state if we're starting a new verification
            if (confirmationForm.dataset.confirmationExpired === 'true') {
                const allMessages =
                    confirmationForm.querySelectorAll('.input-msg');
                allMessages.forEach((msg) => msg.remove());
                confirmationForm.dataset.confirmationExpired = 'false';
            }

            //For successful verification attempt
            if (response.ok) {
                verificationSession = response.data.session_id;
                // Only handle form visibility if it's hidden
                if (confirmationForm.classList.contains('hidden')) {
                    verificationForm.classList.add('hidden');
                    verificationForm.classList.remove('visible');
                    confirmationForm.classList.add('visible');
                    confirmationForm.classList.remove('hidden');

                    // Initialize confirmation code placeholder
                    confirmationForm.classList.add('code-placeholder');
                    confirmationForm.setAttribute(
                        'data-placeholder',
                        '_ _ _ _ _'
                    );
                }
                step.verification = false;
                step.confirmation = true;
                // Start timer for code verification
                const ttl = response.data.phone_verification_ttl;
                startVerificationTimer(ttl, FORMS.CONFIRMATION);
            } else if (
                response.code === -24 &&
                response.message.reason === 'verification_locked'
            ) {
                const { rest_time } = response.message;
                const button = step.verification ? submitButton : confirmButton;
                const input = step.verification
                    ? phoneInput
                    : confirmationCodeInput;
                const form = step.verification
                    ? FORMS.VERIFICATION
                    : FORMS.CONFIRMATION;
                // Clean up existing messages before showing locked state
                removeExistingMessages(
                    form === FORMS.VERIFICATION
                        ? verificationForm
                        : confirmationForm
                );
                button.disabled = true;
                input.disabled = true;
                step.confirmation ? (input.value = '') : null;
                startVerificationTimer(rest_time, form);
            } else if (
                response.code === -24 &&
                response.message.reason ===
                    'phone_number_has_been_confirmed_by_another_user'
            ) {
                showInputMessage(
                    ERROR_MESSAGES.PHONE_CONFIRMED_BY_ANOTHER.message,
                    verificationForm,
                    'error'
                );
            } else if (
                response.code === -4 &&
                response.message.reason === 'wrong_session_or_confirm_code'
            ) {
                confirmButton.disabled = true;
                confirmationCodeInput.value = '';
                showInputMessage(
                    ERROR_MESSAGES.INVALID_CONFIRMATION_CODE.message,
                    confirmationForm,
                    'error'
                );
            } else if (
                response.code === -24 &&
                response.message.reason === 'confirm_code_locked'
            ) {
                // Clean up all existing messages before showing locked state
                removeExistingMessages(confirmationForm);

                const { rest_time } = response.message;
                confirmButton.disabled = true;
                confirmationCodeInput.disabled = true;
                confirmationCodeInput.value = '';
                startVerificationTimer(rest_time, FORMS.CONFIRMATION);
            }
        };

        //User starts to change phone number
        phoneInput.addEventListener('input', (e) => {
            submitButton.disabled = true;
            // Remove is-invalid class initially
            phoneInput.classList.remove('is-invalid');

            const value = e.target.value;
            // Only allow + and numbers
            const newValue = value.replace(/[^+0-9]/g, '');

            if (!newValue) {
                e.target.value = '+380';
                e.target.setSelectionRange(4, 4);
            } else {
                e.target.value = newValue;
            }

            // Validate phone number
            if (!isPhoneValid(value)) {
                phoneInput.classList.add('is-invalid');
            } else {
                submitButton.disabled = false;
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
            confirmButton.disabled = true;
            confirmationCodeInput.classList.remove('is-invalid');
            const code = e.target.value;
            // Only allow numbers
            const newValue = code.replace(/[^0-9]/g, '');

            if (code !== newValue) {
                e.target.value = newValue;
            }
            // Update placeholder
            const parentWrapper = confirmationCodeInput.parentElement;

            if (!parentWrapper.classList.contains('code-placeholder')) {
                parentWrapper.classList.add('code-placeholder');
            }

            // Create dynamic placeholder and set it as a data attribute on the wrapper
            const placeholderValue = Array(5)
                .fill('_')
                .map((char, index) => {
                    // If we have a number at this index, return it without space
                    if (index < newValue.length) {
                        return newValue[index];
                    }
                    // For the first underscore after numbers, don't add space before it
                    if (index === newValue.length) {
                        return '_';
                    }
                    // For remaining underscores, add space before them
                    return ' _';
                })
                .join('');

            parentWrapper.setAttribute('data-placeholder', placeholderValue);

            // Remove only the error message if it exists, keeping timer message
            const errorMessage = confirmationForm.querySelector(
                '[data-code-error="true"]'
            );
            if (errorMessage) {
                errorMessage.remove();
            }

            if (!/^\d{5}$/.test(code)) {
                confirmationCodeInput.classList.add('is-invalid');
            } else {
                confirmButton.disabled = false;
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
            step.verification = true;
            submitButton.disabled = true;
            submittedPhone = e.target[0].value;

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
            step.verification = false;
            step.confirmation = true;
            confirmButton.disabled = true;

            // Check if verification has expired
            if (confirmationForm.dataset.confirmationExpired === 'true') {
                // Reset the form state
                confirmationCodeInput.disabled = false;

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

                return;
            }

            const code = confirmationCodeInput.value;

            try {
                console.log('TRY CONFIRM USER PHONE---CONF FORM');
                const response = await confirmUserPhone(
                    code,
                    verificationSession
                );

                if (response.ok) {
                    defaultFormContainer.classList.add('hidden');
                    formContainerSuccess.classList.remove('hidden');

                    //! Add verification record
                    const userId = user.data.account.id;

                    await addVerification({
                        userid: userId,
                        phone: submittedPhone,
                    });
                }
            } catch (error) {
                console.error('Error confirming code:', error);
                handleVerificationResponse(error);
            }
        });
    }

    function isPhoneValid(phone) {
        const phoneRegex = /^\+380\d{9}$/;
        return phoneRegex.test(phone);
    }

    function removeExistingMessages(targetElement) {
        const existingMessages = targetElement.querySelectorAll('.input-msg');
        existingMessages.forEach((msg) => msg.remove());
    }

    loadTranslations().then(init);

    const mainPage = document.querySelector('.fav__page');
    setTimeout(() => mainPage.classList.add('overflow'), 1000);
})();
