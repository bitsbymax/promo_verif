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
    // let locale = 'uk';
    //locale test
    let locale = sessionStorage.getItem('locale')
        ? sessionStorage.getItem('locale')
        : 'uk';
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
    const loadingWrapper = document.querySelector('.loading__wrapper');
    const defaultFormContainer = document.querySelector('.form__container');
    const formContainerSuccessBefore = document.querySelector(
        '.form__container-successBefore'
    );
    const formContainerSuccess = document.querySelector(
        '.form__container-success'
    );

    //Test buttons
    const authorizedButton = document.querySelector('.button-authorized');
    const notAuthorizedButton = document.querySelector('.button-notAuthorized');
    const successButton = document.querySelector('.button-success');
    const successBeforeButton = document.querySelector('.button-successBefore');
    const langButton = document.querySelector('.button-lang');
    const themeButton = document.querySelector('.button-theme');
    const loadingButton = document.querySelector('.button-loading');

    //States
    let authorized = false;
    let notAuthorized = true;
    let success = false;
    let successBefore = false;
    let loading = false;
    let theme = false;

    async function init() {
        console.log('%c init() fired', 'color: #00ff00; font-weight: bold');

        // if (window.FE?.user.role === 'guest') {
        //     formWrapper.classList.add('hidden');
        //     linkButtonWrapper.classList.add('visible');
        //     linkButtonWrapper.classList.remove('hidden');

        //     return;
        // }

        // let userPhoneNumber = null;
        // let userPhoneVerified = false;
        // let verificationSession = null;
        // let user = null;
        // let cid = null;
        // let verificationTimer = null;
        // let submittedPhone = null;

        // const step = {
        //     confirmation: false,
        //     verification: false,
        // };

        // try {
        //     user = await getUser();
        //     cid = user.cid;
        //     userPhoneNumber = user.data.account.phone_number;
        //     userPhoneVerified = user.data.account.account_status.find(
        //         (status) => status.alias === 'IS_PHONE_VERIFIED'
        //     ).value;

        //     console.log('userPhoneNumber:', userPhoneNumber);
        //     console.log('userPhoneVerified:', userPhoneVerified);
        //     //Check if user has a number and is already verified
        //     if (userPhoneNumber && userPhoneVerified) {
        //         defaultFormContainer.classList.add('hidden');
        //         formContainerSuccessBefore.classList.remove('hidden');

        //         return;
        //     }

        //     verificationForm.classList.add('visible');
        //     verificationForm.classList.remove('hidden');
        //     phoneInput.value = `+${userPhoneNumber}`;
        // } catch (error) {
        //     console.error('Failed to get user:', error);
        // }

        const updateUIBasedOnState = () => {
            console.log('Updating UI, states:', {
                authorized,
                notAuthorized,
                successBefore,
                success,
                loading,
                theme,
            });
            const formContainer = document.querySelector('.form__container');

            if (notAuthorized) {
                console.log('not authorized');
                formWrapper?.classList.add('hidden');
                formContainer?.classList.remove('hidden');
                linkButtonWrapper?.classList.remove('hidden');
                formContainerSuccessBefore?.classList.add('hidden');
                formContainerSuccess?.classList.add('hidden');
            } else if (authorized) {
                console.log('authorized');
                formContainerSuccessBefore?.classList.add('hidden');
                formContainerSuccess?.classList.add('hidden');
                formContainer?.classList.remove('hidden');
                linkButtonWrapper?.classList.add('hidden');
                formWrapper?.classList.remove('hidden');
                verificationForm?.classList.remove('hidden');
            } else if (successBefore) {
                console.log('successBefore');
                formContainer?.classList.add('hidden');
                formContainerSuccessBefore?.classList.remove('hidden');
                formContainerSuccess?.classList.add('hidden');
            } else if (success) {
                console.log('success');
                formContainer?.classList.add('hidden');
                formContainerSuccessBefore?.classList.add('hidden');
                formContainerSuccess?.classList.remove('hidden');
            } else if (loading) {
                formContainerSuccessBefore?.classList.add('hidden');
                formContainerSuccess?.classList.add('hidden');
                formContainer?.classList.remove('hidden');
                formWrapper?.classList.add('hidden');
                linkButtonWrapper?.classList.add('hidden');
                loadingWrapper?.classList.remove('hidden');
            }
        };

        authorizedButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('authorizedButton clicked');
            authorized = true;
            notAuthorized = false;
            success = false;
            successBefore = false;
            loading = false;
            theme = false;
            updateUIBasedOnState();
        });

        notAuthorizedButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('notAuthorizedButton clicked');
            authorized = false;
            notAuthorized = true;
            success = false;
            successBefore = false;
            loading = false;
            theme = false;
            updateUIBasedOnState();
        });

        successBeforeButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('successBeforeButton clicked');
            authorized = false;
            notAuthorized = false;
            success = false;
            successBefore = true;
            loading = false;
            theme = false;
            updateUIBasedOnState();
        });

        successButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('successButton clicked');
            authorized = false;
            notAuthorized = false;
            success = true;
            successBefore = false;
            loading = false;
            theme = false;
            updateUIBasedOnState();
        });

        loadingButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('loadingButton clicked');
            authorized = false;
            notAuthorized = false;
            success = false;
            successBefore = false;
            loading = true;
            theme = false;
            updateUIBasedOnState();
        });

        langButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('langButton clicked');
            if (locale === 'uk') {
                sessionStorage.setItem('locale', 'en');
                window.location.reload();
                return;
            }
            if (locale === 'en') {
                sessionStorage.setItem('locale', 'uk');
                window.location.reload();
                return;
            }
        });

        themeButton.addEventListener('click', (e) => {
            e.preventDefault();
            document.body.classList.toggle('dark');
        });

        // Initial UI update
        updateUIBasedOnState();

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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gKCkge1xuICAgIGNvbnN0IEVSUk9SX01FU1NBR0VTID0ge1xuICAgICAgICBJTlZBTElEX1BIT05FX0ZPUk1BVDoge1xuICAgICAgICAgICAgbWVzc2FnZTogJ9Ck0L7RgNC80LDRgiDRgtC10LvQtdGE0L7QvdGDINCy0LrQsNC30LDQvdC+INC90LXQv9GA0LDQstC40LvRjNC90L4nLFxuICAgICAgICAgICAgdHJhbnNsYXRlS2V5OiAnZXJyb3JJbnZhbGlkUGhvbmVGb3JtYXQnLFxuICAgICAgICB9LFxuICAgICAgICBQSE9ORV9BTFJFQURZX1VTRUQ6IHtcbiAgICAgICAgICAgIG1lc3NhZ2U6ICfQptC10Lkg0L3QvtC80LXRgCDRgtC10LvQtdGE0L7QvdGDINCy0LbQtSDQstC40LrQvtGA0LjRgdGC0L7QstGD0ZTRgtGM0YHRjycsXG4gICAgICAgICAgICB0cmFuc2xhdGVLZXk6ICdlcnJvclBob25lQWxyZWFkeVVzZWQnLFxuICAgICAgICB9LFxuICAgICAgICBQSE9ORV9DT05GSVJNRURfQllfQU5PVEhFUjoge1xuICAgICAgICAgICAgbWVzc2FnZTogJ9Cm0LXQuSDQvdC+0LzQtdGAINGC0LXQu9C10YTQvtC90YMg0LHRg9C70L4g0L/RltC00YLQstC10YDQtNC20LXQvdC+INGW0L3RiNC40Lwg0LrQvtGA0LjRgdGC0YPQstCw0YfQtdC8JyxcbiAgICAgICAgICAgIHRyYW5zbGF0ZUtleTogJ2Vycm9yUGhvbmVDb25maXJtZWRCeUFub3RoZXInLFxuICAgICAgICB9LFxuICAgICAgICBWRVJJRklDQVRJT05fRVhQSVJFRDoge1xuICAgICAgICAgICAgbWVzc2FnZTogJ9Cn0LDRgSDQstC10YDQuNGE0ZbQutCw0YbRltGXINC80LjQvdGD0LInLFxuICAgICAgICAgICAgdHJhbnNsYXRlS2V5OiAnZXJyb3JWZXJpZmljYXRpb25FeHBpcmVkJyxcbiAgICAgICAgfSxcbiAgICAgICAgSU5WQUxJRF9DT05GSVJNQVRJT05fQ09ERToge1xuICAgICAgICAgICAgbWVzc2FnZTogJ9Cd0LXQv9GA0LDQstC40LvRjNC90LjQuSDQutC+0LQg0L/RltC00YLQstC10YDQtNC20LXQvdC90Y8nLFxuICAgICAgICAgICAgdHJhbnNsYXRlS2V5OiAnZXJyb3JJbnZhbGlkQ29uZmlybWF0aW9uQ29kZScsXG4gICAgICAgIH0sXG4gICAgICAgIFZFUklGSUNBVElPTl9MT0NLRUQ6IHtcbiAgICAgICAgICAgIG1lc3NhZ2U6ICfQstC10YDQuNGE0ZbQutCw0YbRltGOINC30LDQsdC70L7QutC+0LLQsNC90L4uINCU0L7Rh9C10LrQsNC50YLQtdGB0Ywg0L7QvdC+0LLQu9C10L3QvdGPINGC0LDQudC80LXRgNCwJyxcbiAgICAgICAgICAgIHRyYW5zbGF0ZUtleTogJ2Vycm9yVmVyaWZpY2F0aW9uTG9ja2VkJyxcbiAgICAgICAgfSxcbiAgICAgICAgU01TX0NPREVfVElNRVI6IHtcbiAgICAgICAgICAgIG1lc3NhZ2U6XG4gICAgICAgICAgICAgICAgJ9GH0LDRgSwg0Y/QutC40Lkg0LfQsNC70LjRiNC40LLRgdGPLCDRidC+0LEg0LLQstC10YHRgtC4INC60L7QtCDQtyBTTVMt0L/QvtCy0ZbQtNC+0LzQu9C10L3QvdGPLiDQn9GW0YHQu9GPINC30LDQutGW0L3Rh9C10L3QvdGPINGH0LDRgdGDINC80L7QttC90LAg0LfQsNC/0YDQvtGB0LjRgtC4INC60L7QtCDQv9C+0LLRgtC+0YDQvdC+JyxcbiAgICAgICAgICAgIHRyYW5zbGF0ZUtleTogJ3Ntc0NvZGVUaW1lcicsXG4gICAgICAgIH0sXG4gICAgfTtcbiAgICBjb25zdCBGT1JNUyA9IHtcbiAgICAgICAgQ09ORklSTUFUSU9OOiAnY29uZmlybWF0aW9uJyxcbiAgICAgICAgVkVSSUZJQ0FUSU9OOiAndmVyaWZpY2F0aW9uJyxcbiAgICB9O1xuICAgIGNvbnN0IEFQSSA9ICdodHRwczovL2Zhdi1wcm9tLmNvbSc7XG4gICAgY29uc3QgRU5EUE9JTlQgPSAnYXBpX3ZlcmlmaWNhdGlvbic7XG5cbiAgICAvLyAjcmVnaW9uIFRyYW5zbGF0aW9uXG4gICAgY29uc3QgdWtMZW5nID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3VrTGVuZycpO1xuICAgIGNvbnN0IGVuTGVuZyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNlbkxlbmcnKTtcbiAgICBsZXQgaTE4bkRhdGEgPSB7fTtcbiAgICAvLyBsZXQgbG9jYWxlID0gJ3VrJztcbiAgICAvL2xvY2FsZSB0ZXN0XG4gICAgbGV0IGxvY2FsZSA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oJ2xvY2FsZScpXG4gICAgICAgID8gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbSgnbG9jYWxlJylcbiAgICAgICAgOiAndWsnO1xuICAgIGlmICh1a0xlbmcpIGxvY2FsZSA9ICd1ayc7XG4gICAgaWYgKGVuTGVuZykgbG9jYWxlID0gJ2VuJztcblxuICAgIGZ1bmN0aW9uIGxvYWRUcmFuc2xhdGlvbnMoKSB7XG4gICAgICAgIHJldHVybiBmZXRjaChgJHtBUEl9LyR7RU5EUE9JTlR9L3RyYW5zbGF0ZXMvJHtsb2NhbGV9YClcbiAgICAgICAgICAgIC50aGVuKChyZXMpID0+IHJlcy5qc29uKCkpXG4gICAgICAgICAgICAudGhlbigoanNvbikgPT4ge1xuICAgICAgICAgICAgICAgIGkxOG5EYXRhID0ganNvbjtcbiAgICAgICAgICAgICAgICB0cmFuc2xhdGUoKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IG11dGF0aW9uT2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbiAoXG4gICAgICAgICAgICAgICAgICAgIG11dGF0aW9uc1xuICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2xhdGUoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBtdXRhdGlvbk9ic2VydmVyLm9ic2VydmUoXG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd2ZXJpZmljYXRpb24nKSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRMaXN0OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3VidHJlZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0cmFuc2xhdGUoKSB7XG4gICAgICAgIGNvbnN0IGVsZW1zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtdHJhbnNsYXRlXScpO1xuICAgICAgICBpZiAoZWxlbXMgJiYgZWxlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBlbGVtcy5mb3JFYWNoKChlbGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qga2V5ID0gZWxlbS5nZXRBdHRyaWJ1dGUoJ2RhdGEtdHJhbnNsYXRlJyk7XG4gICAgICAgICAgICAgICAgZWxlbS5pbm5lckhUTUwgPSB0cmFuc2xhdGVLZXkoa2V5KTtcbiAgICAgICAgICAgICAgICBlbGVtLnJlbW92ZUF0dHJpYnV0ZSgnZGF0YS10cmFuc2xhdGUnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxvY2FsZSA9PT0gJ2VuJykge1xuICAgICAgICAgICAgbWFpblBhZ2UuY2xhc3NMaXN0LmFkZCgnZW4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlZnJlc2hMb2NhbGl6ZWRDbGFzcygpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyYW5zbGF0ZUtleShrZXkpIHtcbiAgICAgICAgaWYgKCFrZXkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgaTE4bkRhdGFba2V5XSB8fCAnKi0tLS1ORUVEIFRPIEJFIFRSQU5TTEFURUQtLS0tKiAgIGtleTogICcgKyBrZXlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZWZyZXNoTG9jYWxpemVkQ2xhc3MoZWxlbWVudCwgYmFzZUNzc0NsYXNzKSB7XG4gICAgICAgIGlmICghZWxlbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgbGFuZyBvZiBbJ3VrJywgJ2VuJ10pIHtcbiAgICAgICAgICAgIGVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShiYXNlQ3NzQ2xhc3MgKyBsYW5nKTtcbiAgICAgICAgfVxuICAgICAgICBlbGVtZW50LmNsYXNzTGlzdC5hZGQoYmFzZUNzc0NsYXNzICsgbG9jYWxlKTtcbiAgICB9XG5cbiAgICAvLyAjZW5kcmVnaW9uXG5cbiAgICBhc3luYyBmdW5jdGlvbiBnZXRVc2VyKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzID0gYXdhaXQgd2luZG93LkZFLnNvY2tldF9zZW5kKHtcbiAgICAgICAgICAgICAgICBjbWQ6ICdnZXRfdXNlcicsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnZXRVc2VyIHJlc3BvbnNlJywgcmVzKTtcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBmZXRjaGluZyB1c2VyOicsIGVycm9yKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgZnVuY3Rpb24gdmVyaWZ5VXNlclBob25lKGNpZCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzID0gYXdhaXQgd2luZG93LkZFLnNvY2tldF9zZW5kKHtcbiAgICAgICAgICAgICAgICBjbWQ6ICdhY2NvdW50aW5nL3VzZXJfcGhvbmVfdmVyaWZ5JyxcbiAgICAgICAgICAgICAgICBjaWQsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd2ZXJpZnlVc2VyUGhvbmUgcmVzcG9uc2UnLCByZXMpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHZlcmlmeWluZyB1c2VyIHBob25lOicsIGVycm9yKTtcblxuICAgICAgICAgICAgcmV0dXJuIGVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgZnVuY3Rpb24gY2hhbmdlVXNlclBob25lKHVzZXJEYXRhKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKCcvYWNjb3VudGluZy9hcGkvY2hhbmdlX3VzZXInLCB7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgYm9keTogdXNlckRhdGEsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnY2hhbmdlVXNlclBob25lIHJlc3BvbnNlOicsIGRhdGEpO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjaGFuZ2luZyB1c2VyIHBob25lOicsIGVycm9yKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgZnVuY3Rpb24gY29uZmlybVVzZXJQaG9uZShjb25maXJtQ29kZSwgc2Vzc2lvbklkKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXMgPSBhd2FpdCB3aW5kb3cuRkUuc29ja2V0X3NlbmQoe1xuICAgICAgICAgICAgICAgIGNtZDogJ2FjY291bnRpbmcvdXNlcl9waG9uZV9jb25maXJtJyxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpcm1fY29kZTogYCR7Y29uZmlybUNvZGV9YCxcbiAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbl9pZDogYCR7c2Vzc2lvbklkfWAsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnY29uZmlybVVzZXJQaG9uZSByZXNwb25zZScsIHJlcyk7XG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgY29uZmlybWluZyB1c2VyIHBob25lOicsIGVycm9yKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgZnVuY3Rpb24gYWRkVmVyaWZpY2F0aW9uKGRhdGEpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IGZldGNoKGAke0FQSX0vJHtFTkRQT0lOVH1gLCB7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGFkZGluZyB2ZXJpZmljYXRpb246JywgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBsZXQgZGF5TG9jayA9IGZhbHNlO1xuXG4gICAgZnVuY3Rpb24gc2hvd0lucHV0TWVzc2FnZShtZXNzYWdlLCB0YXJnZXRFbGVtZW50LCBzdGF0ZSA9IGZhbHNlKSB7XG4gICAgICAgIGNvbnN0IGlucHV0RWxlbWVudCA9IHRhcmdldEVsZW1lbnQucXVlcnlTZWxlY3RvcignaW5wdXQnKTtcbiAgICAgICAgY29uc3QgYnV0dG9uRWxlbWVudCA9IHRhcmdldEVsZW1lbnQucXVlcnlTZWxlY3RvcignYnV0dG9uJyk7XG4gICAgICAgIGRvY3VtZW50XG4gICAgICAgICAgICAuZ2V0RWxlbWVudEJ5SWQoJ2NvbmZpcm1hdGlvbl9fZm9ybScpXG4gICAgICAgICAgICAuc2V0QXR0cmlidXRlKCdkYXRhLXBsYWNlaG9sZGVyJywgJycpO1xuICAgICAgICAvLyBGaW5kIGVycm9yIG1lc3NhZ2Ugb2JqZWN0IGlmIGl0IGV4aXN0c1xuICAgICAgICBsZXQgZXJyb3JPYmogPSBudWxsO1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBFUlJPUl9NRVNTQUdFUykge1xuICAgICAgICAgICAgaWYgKEVSUk9SX01FU1NBR0VTW2tleV0ubWVzc2FnZSA9PT0gbWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIGVycm9yT2JqID0gRVJST1JfTUVTU0FHRVNba2V5XTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCBleGlzdGluZ01lc3NhZ2VzID0gdGFyZ2V0RWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuaW5wdXQtbXNnJyk7XG4gICAgICAgIGNvbnN0IGlzVGltZXJNZXNzYWdlID0gQXJyYXkuaXNBcnJheShtZXNzYWdlKSAmJiBtZXNzYWdlLmxlbmd0aCA9PT0gMjtcbiAgICAgICAgLy8gQ2hlY2sgZm9yIGV4aXN0aW5nIG1lc3NhZ2VzIHdpdGggdGhlIHNhbWUgY29udGVudFxuICAgICAgICBmb3IgKGNvbnN0IG1zZyBvZiBleGlzdGluZ01lc3NhZ2VzKSB7XG4gICAgICAgICAgICAvLyBIYW5kbGUgdGltZXIgbWVzc2FnZSByZXBsYWNlbWVudFxuICAgICAgICAgICAgaWYgKGlzVGltZXJNZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGltZXJXcmFwcGVyID0gbXNnLnF1ZXJ5U2VsZWN0b3IoJy50aW1lcldyYXBwZXInKTtcbiAgICAgICAgICAgICAgICBpZiAodGltZXJXcmFwcGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHRoaXMgaXMgYSBuZXcgdGltZXIgbWVzc2FnZSBhbmQgd2UgZm91bmQgYW4gZXhpc3RpbmcgdGltZXJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGltZXIgPSB0aW1lcldyYXBwZXIucXVlcnlTZWxlY3RvcignLnRpbWVyJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aW1lcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGltZXIudGV4dENvbnRlbnQgPSBtZXNzYWdlWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuOyAvLyBFeGl0IGFmdGVyIHVwZGF0aW5nIGV4aXN0aW5nIHRpbWVyXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gRG9uJ3QgcmVtb3ZlIHRpbWVyIG1lc3NhZ2UgaWYgaXQgZXhpc3RzIGFuZCB3ZSdyZSBzaG93aW5nIGEgZGlmZmVyZW50IG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobXNnLnRleHRDb250ZW50ID09PSBtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuOyAvLyBFeGl0IGlmIG5vbi10aW1lciBtZXNzYWdlIGFscmVhZHkgZXhpc3RzXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBSZW1vdmUgbm9uLXRpbWVyIG1lc3NhZ2VzIG9yIG9sZCB0aW1lciBtZXNzYWdlcyBpZiB3ZSdyZSBzaG93aW5nIGEgbmV3IHRpbWVyXG4gICAgICAgICAgICBpZiAoIW1zZy5xdWVyeVNlbGVjdG9yKCcudGltZXJXcmFwcGVyJykgfHwgaXNUaW1lck1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICBtc2cucmVtb3ZlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDcmVhdGUgbmV3IG1lc3NhZ2UgZWxlbWVudFxuICAgICAgICBjb25zdCBtZXNzYWdlRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICBtZXNzYWdlRWxlbWVudC5jbGFzc0xpc3QuYWRkKCdpbnB1dC1tc2cnKTtcblxuICAgICAgICBpZiAoaXNUaW1lck1lc3NhZ2UpIHtcbiAgICAgICAgICAgIC8vIENyZWF0ZSB0aW1lciB3cmFwcGVyIHN0cnVjdHVyZVxuICAgICAgICAgICAgY29uc3QgdGltZXJXcmFwcGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICB0aW1lcldyYXBwZXIuY2xhc3NMaXN0LmFkZCgndGltZXJXcmFwcGVyJyk7XG4gICAgICAgICAgICAvLyBTZXQgbWluLXdpZHRoIGJhc2VkIG9uIGxvY2sgdHlwZVxuICAgICAgICAgICAgdGltZXJXcmFwcGVyLnN0eWxlLm1pbldpZHRoID0gZGF5TG9jayA/ICc2M3B4JyA6ICc0NXB4JztcbiAgICAgICAgICAgIC8vIENyZWF0ZSBhbmQgc2V0dXAgdGltZXIgZWxlbWVudFxuICAgICAgICAgICAgY29uc3QgdGltZXJFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgdGltZXJFbGVtZW50LnRleHRDb250ZW50ID0gbWVzc2FnZVswXTtcbiAgICAgICAgICAgIHRpbWVyRWxlbWVudC5jbGFzc0xpc3QuYWRkKCd0aW1lcicpO1xuICAgICAgICAgICAgdGltZXJXcmFwcGVyLmFwcGVuZENoaWxkKHRpbWVyRWxlbWVudCk7XG4gICAgICAgICAgICAvLyBDcmVhdGUgYW5kIHNldHVwIG1lc3NhZ2UgZWxlbWVudFxuICAgICAgICAgICAgY29uc3QgbWVzc2FnZVRleHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICBtZXNzYWdlVGV4dC50ZXh0Q29udGVudCA9IG1lc3NhZ2VbMV07XG4gICAgICAgICAgICBtZXNzYWdlVGV4dC5jbGFzc0xpc3QuYWRkKHN0YXRlID8gJ2Vycm9yJyA6ICd3YXJuaW5nJyk7XG4gICAgICAgICAgICAvLyBIYW5kbGUgdHJhbnNsYXRpb24ga2V5c1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2VbMV0gPT09IEVSUk9SX01FU1NBR0VTLlZFUklGSUNBVElPTl9MT0NLRUQubWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VUZXh0LnNldEF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgICAgICAgJ2RhdGEtdHJhbnNsYXRlJyxcbiAgICAgICAgICAgICAgICAgICAgRVJST1JfTUVTU0FHRVMuVkVSSUZJQ0FUSU9OX0xPQ0tFRC50cmFuc2xhdGVLZXlcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlWzFdID09PSBFUlJPUl9NRVNTQUdFUy5TTVNfQ09ERV9USU1FUi5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZVRleHQuc2V0QXR0cmlidXRlKFxuICAgICAgICAgICAgICAgICAgICAnZGF0YS10cmFuc2xhdGUnLFxuICAgICAgICAgICAgICAgICAgICBFUlJPUl9NRVNTQUdFUy5TTVNfQ09ERV9USU1FUi50cmFuc2xhdGVLZXlcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQXNzZW1ibGUgdGhlIG1lc3NhZ2Ugc3RydWN0dXJlXG4gICAgICAgICAgICBtZXNzYWdlRWxlbWVudC5hcHBlbmRDaGlsZCh0aW1lcldyYXBwZXIpO1xuICAgICAgICAgICAgbWVzc2FnZUVsZW1lbnQuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJyAnKSk7XG4gICAgICAgICAgICBtZXNzYWdlRWxlbWVudC5hcHBlbmRDaGlsZChtZXNzYWdlVGV4dCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtZXNzYWdlRWxlbWVudC50ZXh0Q29udGVudCA9IG1lc3NhZ2U7XG4gICAgICAgICAgICAvLyBBZGQgdHJhbnNsYXRpb24ga2V5IGlmIGVycm9yIG1lc3NhZ2UgZXhpc3RzIGluIG91ciBzdHJ1Y3R1cmVcbiAgICAgICAgICAgIGlmIChlcnJvck9iaikge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VFbGVtZW50LnNldEF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgICAgICAgJ2RhdGEtdHJhbnNsYXRlJyxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JPYmoudHJhbnNsYXRlS2V5XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIG1lc3NhZ2VFbGVtZW50LmNsYXNzTGlzdC5hZGQoc3RhdGUgPyAnZXJyb3InIDogJ3dhcm5pbmcnKTtcblxuICAgICAgICAvLyBIYW5kbGUgbWVzc2FnZSBwb3NpdGlvbmluZ1xuICAgICAgICBpZiAobWVzc2FnZSA9PT0gRVJST1JfTUVTU0FHRVMuSU5WQUxJRF9DT05GSVJNQVRJT05fQ09ERS5tZXNzYWdlKSB7XG4gICAgICAgICAgICBtZXNzYWdlRWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2RhdGEtY29kZS1lcnJvcicsICd0cnVlJyk7XG4gICAgICAgICAgICAvLyBBbHdheXMgaW5zZXJ0IGVycm9yIG1lc3NhZ2VzIGF0IHRoZSB0b3BcbiAgICAgICAgICAgIGlucHV0RWxlbWVudC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShcbiAgICAgICAgICAgICAgICBtZXNzYWdlRWxlbWVudCxcbiAgICAgICAgICAgICAgICBpbnB1dEVsZW1lbnQubmV4dFNpYmxpbmdcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAvLyBNb3ZlIGFueSBleGlzdGluZyBub24tZXJyb3IgbWVzc2FnZXMgYmVsb3cgdGhpcyBvbmVcbiAgICAgICAgICAgIGNvbnN0IG90aGVyTWVzc2FnZXMgPSB0YXJnZXRFbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXG4gICAgICAgICAgICAgICAgJy5pbnB1dC1tc2c6bm90KFtkYXRhLWNvZGUtZXJyb3JdKSdcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBvdGhlck1lc3NhZ2VzLmZvckVhY2goKG1zZykgPT4ge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VFbGVtZW50LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKFxuICAgICAgICAgICAgICAgICAgICBtc2csXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VFbGVtZW50Lm5leHRTaWJsaW5nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRm9yIG5vbi1lcnJvciBtZXNzYWdlcywgaW5zZXJ0IGFmdGVyIGFueSBleGlzdGluZyBlcnJvciBtZXNzYWdlLCBvciBiZWZvcmUgdGhlIGJ1dHRvblxuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmdFcnJvck1zZyA9XG4gICAgICAgICAgICAgICAgdGFyZ2V0RWxlbWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1jb2RlLWVycm9yXScpO1xuICAgICAgICAgICAgY29uc3QgaW5zZXJ0QmVmb3JlID0gZXhpc3RpbmdFcnJvck1zZ1xuICAgICAgICAgICAgICAgID8gZXhpc3RpbmdFcnJvck1zZy5uZXh0U2libGluZ1xuICAgICAgICAgICAgICAgIDogYnV0dG9uRWxlbWVudDtcbiAgICAgICAgICAgIGlucHV0RWxlbWVudC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShtZXNzYWdlRWxlbWVudCwgaW5zZXJ0QmVmb3JlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHBob25lSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGhvbmUnKTtcbiAgICBjb25zdCBjb25maXJtYXRpb25Db2RlSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29uZmlybWF0aW9uLWNvZGUnKTtcbiAgICBjb25zdCB2ZXJpZmljYXRpb25Gb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ZlcmlmaWNhdGlvbl9fZm9ybScpO1xuICAgIGNvbnN0IGNvbmZpcm1hdGlvbkZvcm0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29uZmlybWF0aW9uX19mb3JtJyk7XG4gICAgY29uc3QgbGlua0J1dHRvbldyYXBwZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubGlua19fYnV0dG9uLXdyYXBwZXInKTtcbiAgICBjb25zdCBzdWJtaXRCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc3VibWl0LWJ1dHRvbicpO1xuICAgIGNvbnN0IGNvbmZpcm1CdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29uZmlybS1idXR0b24nKTtcbiAgICBjb25zdCBmb3JtV3JhcHBlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5mb3JtX193cmFwcGVyJyk7XG4gICAgY29uc3QgbG9hZGluZ1dyYXBwZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubG9hZGluZ19fd3JhcHBlcicpO1xuICAgIGNvbnN0IGRlZmF1bHRGb3JtQ29udGFpbmVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmZvcm1fX2NvbnRhaW5lcicpO1xuICAgIGNvbnN0IGZvcm1Db250YWluZXJTdWNjZXNzQmVmb3JlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcbiAgICAgICAgJy5mb3JtX19jb250YWluZXItc3VjY2Vzc0JlZm9yZSdcbiAgICApO1xuICAgIGNvbnN0IGZvcm1Db250YWluZXJTdWNjZXNzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcbiAgICAgICAgJy5mb3JtX19jb250YWluZXItc3VjY2VzcydcbiAgICApO1xuXG4gICAgLy9UZXN0IGJ1dHRvbnNcbiAgICBjb25zdCBhdXRob3JpemVkQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmJ1dHRvbi1hdXRob3JpemVkJyk7XG4gICAgY29uc3Qgbm90QXV0aG9yaXplZEJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5idXR0b24tbm90QXV0aG9yaXplZCcpO1xuICAgIGNvbnN0IHN1Y2Nlc3NCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYnV0dG9uLXN1Y2Nlc3MnKTtcbiAgICBjb25zdCBzdWNjZXNzQmVmb3JlQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmJ1dHRvbi1zdWNjZXNzQmVmb3JlJyk7XG4gICAgY29uc3QgbGFuZ0J1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5idXR0b24tbGFuZycpO1xuICAgIGNvbnN0IHRoZW1lQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmJ1dHRvbi10aGVtZScpO1xuICAgIGNvbnN0IGxvYWRpbmdCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYnV0dG9uLWxvYWRpbmcnKTtcblxuICAgIC8vU3RhdGVzXG4gICAgbGV0IGF1dGhvcml6ZWQgPSBmYWxzZTtcbiAgICBsZXQgbm90QXV0aG9yaXplZCA9IHRydWU7XG4gICAgbGV0IHN1Y2Nlc3MgPSBmYWxzZTtcbiAgICBsZXQgc3VjY2Vzc0JlZm9yZSA9IGZhbHNlO1xuICAgIGxldCBsb2FkaW5nID0gZmFsc2U7XG4gICAgbGV0IHRoZW1lID0gZmFsc2U7XG5cbiAgICBhc3luYyBmdW5jdGlvbiBpbml0KCkge1xuICAgICAgICBjb25zb2xlLmxvZygnJWMgaW5pdCgpIGZpcmVkJywgJ2NvbG9yOiAjMDBmZjAwOyBmb250LXdlaWdodDogYm9sZCcpO1xuXG4gICAgICAgIC8vIGlmICh3aW5kb3cuRkU/LnVzZXIucm9sZSA9PT0gJ2d1ZXN0Jykge1xuICAgICAgICAvLyAgICAgZm9ybVdyYXBwZXIuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgICAgIC8vICAgICBsaW5rQnV0dG9uV3JhcHBlci5jbGFzc0xpc3QuYWRkKCd2aXNpYmxlJyk7XG4gICAgICAgIC8vICAgICBsaW5rQnV0dG9uV3JhcHBlci5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcblxuICAgICAgICAvLyAgICAgcmV0dXJuO1xuICAgICAgICAvLyB9XG5cbiAgICAgICAgLy8gbGV0IHVzZXJQaG9uZU51bWJlciA9IG51bGw7XG4gICAgICAgIC8vIGxldCB1c2VyUGhvbmVWZXJpZmllZCA9IGZhbHNlO1xuICAgICAgICAvLyBsZXQgdmVyaWZpY2F0aW9uU2Vzc2lvbiA9IG51bGw7XG4gICAgICAgIC8vIGxldCB1c2VyID0gbnVsbDtcbiAgICAgICAgLy8gbGV0IGNpZCA9IG51bGw7XG4gICAgICAgIC8vIGxldCB2ZXJpZmljYXRpb25UaW1lciA9IG51bGw7XG4gICAgICAgIC8vIGxldCBzdWJtaXR0ZWRQaG9uZSA9IG51bGw7XG5cbiAgICAgICAgLy8gY29uc3Qgc3RlcCA9IHtcbiAgICAgICAgLy8gICAgIGNvbmZpcm1hdGlvbjogZmFsc2UsXG4gICAgICAgIC8vICAgICB2ZXJpZmljYXRpb246IGZhbHNlLFxuICAgICAgICAvLyB9O1xuXG4gICAgICAgIC8vIHRyeSB7XG4gICAgICAgIC8vICAgICB1c2VyID0gYXdhaXQgZ2V0VXNlcigpO1xuICAgICAgICAvLyAgICAgY2lkID0gdXNlci5jaWQ7XG4gICAgICAgIC8vICAgICB1c2VyUGhvbmVOdW1iZXIgPSB1c2VyLmRhdGEuYWNjb3VudC5waG9uZV9udW1iZXI7XG4gICAgICAgIC8vICAgICB1c2VyUGhvbmVWZXJpZmllZCA9IHVzZXIuZGF0YS5hY2NvdW50LmFjY291bnRfc3RhdHVzLmZpbmQoXG4gICAgICAgIC8vICAgICAgICAgKHN0YXR1cykgPT4gc3RhdHVzLmFsaWFzID09PSAnSVNfUEhPTkVfVkVSSUZJRUQnXG4gICAgICAgIC8vICAgICApLnZhbHVlO1xuXG4gICAgICAgIC8vICAgICBjb25zb2xlLmxvZygndXNlclBob25lTnVtYmVyOicsIHVzZXJQaG9uZU51bWJlcik7XG4gICAgICAgIC8vICAgICBjb25zb2xlLmxvZygndXNlclBob25lVmVyaWZpZWQ6JywgdXNlclBob25lVmVyaWZpZWQpO1xuICAgICAgICAvLyAgICAgLy9DaGVjayBpZiB1c2VyIGhhcyBhIG51bWJlciBhbmQgaXMgYWxyZWFkeSB2ZXJpZmllZFxuICAgICAgICAvLyAgICAgaWYgKHVzZXJQaG9uZU51bWJlciAmJiB1c2VyUGhvbmVWZXJpZmllZCkge1xuICAgICAgICAvLyAgICAgICAgIGRlZmF1bHRGb3JtQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgICAgICAvLyAgICAgICAgIGZvcm1Db250YWluZXJTdWNjZXNzQmVmb3JlLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuXG4gICAgICAgIC8vICAgICAgICAgcmV0dXJuO1xuICAgICAgICAvLyAgICAgfVxuXG4gICAgICAgIC8vICAgICB2ZXJpZmljYXRpb25Gb3JtLmNsYXNzTGlzdC5hZGQoJ3Zpc2libGUnKTtcbiAgICAgICAgLy8gICAgIHZlcmlmaWNhdGlvbkZvcm0uY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG4gICAgICAgIC8vICAgICBwaG9uZUlucHV0LnZhbHVlID0gYCske3VzZXJQaG9uZU51bWJlcn1gO1xuICAgICAgICAvLyB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAvLyAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGdldCB1c2VyOicsIGVycm9yKTtcbiAgICAgICAgLy8gfVxuXG4gICAgICAgIGNvbnN0IHVwZGF0ZVVJQmFzZWRPblN0YXRlID0gKCkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1VwZGF0aW5nIFVJLCBzdGF0ZXM6Jywge1xuICAgICAgICAgICAgICAgIGF1dGhvcml6ZWQsXG4gICAgICAgICAgICAgICAgbm90QXV0aG9yaXplZCxcbiAgICAgICAgICAgICAgICBzdWNjZXNzQmVmb3JlLFxuICAgICAgICAgICAgICAgIHN1Y2Nlc3MsXG4gICAgICAgICAgICAgICAgbG9hZGluZyxcbiAgICAgICAgICAgICAgICB0aGVtZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc3QgZm9ybUNvbnRhaW5lciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5mb3JtX19jb250YWluZXInKTtcblxuICAgICAgICAgICAgaWYgKG5vdEF1dGhvcml6ZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbm90IGF1dGhvcml6ZWQnKTtcbiAgICAgICAgICAgICAgICBmb3JtV3JhcHBlcj8uY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgZm9ybUNvbnRhaW5lcj8uY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgbGlua0J1dHRvbldyYXBwZXI/LmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIGZvcm1Db250YWluZXJTdWNjZXNzQmVmb3JlPy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICBmb3JtQ29udGFpbmVyU3VjY2Vzcz8uY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGF1dGhvcml6ZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnYXV0aG9yaXplZCcpO1xuICAgICAgICAgICAgICAgIGZvcm1Db250YWluZXJTdWNjZXNzQmVmb3JlPy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICBmb3JtQ29udGFpbmVyU3VjY2Vzcz8uY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgZm9ybUNvbnRhaW5lcj8uY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgbGlua0J1dHRvbldyYXBwZXI/LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIGZvcm1XcmFwcGVyPy5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25Gb3JtPy5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3VjY2Vzc0JlZm9yZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzdWNjZXNzQmVmb3JlJyk7XG4gICAgICAgICAgICAgICAgZm9ybUNvbnRhaW5lcj8uY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgZm9ybUNvbnRhaW5lclN1Y2Nlc3NCZWZvcmU/LmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIGZvcm1Db250YWluZXJTdWNjZXNzPy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzdWNjZXNzJyk7XG4gICAgICAgICAgICAgICAgZm9ybUNvbnRhaW5lcj8uY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgZm9ybUNvbnRhaW5lclN1Y2Nlc3NCZWZvcmU/LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIGZvcm1Db250YWluZXJTdWNjZXNzPy5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobG9hZGluZykge1xuICAgICAgICAgICAgICAgIGZvcm1Db250YWluZXJTdWNjZXNzQmVmb3JlPy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICBmb3JtQ29udGFpbmVyU3VjY2Vzcz8uY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgZm9ybUNvbnRhaW5lcj8uY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgZm9ybVdyYXBwZXI/LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIGxpbmtCdXR0b25XcmFwcGVyPy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICBsb2FkaW5nV3JhcHBlcj8uY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgYXV0aG9yaXplZEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnYXV0aG9yaXplZEJ1dHRvbiBjbGlja2VkJyk7XG4gICAgICAgICAgICBhdXRob3JpemVkID0gdHJ1ZTtcbiAgICAgICAgICAgIG5vdEF1dGhvcml6ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHN1Y2Nlc3MgPSBmYWxzZTtcbiAgICAgICAgICAgIHN1Y2Nlc3NCZWZvcmUgPSBmYWxzZTtcbiAgICAgICAgICAgIGxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoZW1lID0gZmFsc2U7XG4gICAgICAgICAgICB1cGRhdGVVSUJhc2VkT25TdGF0ZSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICBub3RBdXRob3JpemVkQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdub3RBdXRob3JpemVkQnV0dG9uIGNsaWNrZWQnKTtcbiAgICAgICAgICAgIGF1dGhvcml6ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIG5vdEF1dGhvcml6ZWQgPSB0cnVlO1xuICAgICAgICAgICAgc3VjY2VzcyA9IGZhbHNlO1xuICAgICAgICAgICAgc3VjY2Vzc0JlZm9yZSA9IGZhbHNlO1xuICAgICAgICAgICAgbG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgdGhlbWUgPSBmYWxzZTtcbiAgICAgICAgICAgIHVwZGF0ZVVJQmFzZWRPblN0YXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHN1Y2Nlc3NCZWZvcmVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3N1Y2Nlc3NCZWZvcmVCdXR0b24gY2xpY2tlZCcpO1xuICAgICAgICAgICAgYXV0aG9yaXplZCA9IGZhbHNlO1xuICAgICAgICAgICAgbm90QXV0aG9yaXplZCA9IGZhbHNlO1xuICAgICAgICAgICAgc3VjY2VzcyA9IGZhbHNlO1xuICAgICAgICAgICAgc3VjY2Vzc0JlZm9yZSA9IHRydWU7XG4gICAgICAgICAgICBsb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB0aGVtZSA9IGZhbHNlO1xuICAgICAgICAgICAgdXBkYXRlVUlCYXNlZE9uU3RhdGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc3VjY2Vzc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc3VjY2Vzc0J1dHRvbiBjbGlja2VkJyk7XG4gICAgICAgICAgICBhdXRob3JpemVkID0gZmFsc2U7XG4gICAgICAgICAgICBub3RBdXRob3JpemVkID0gZmFsc2U7XG4gICAgICAgICAgICBzdWNjZXNzID0gdHJ1ZTtcbiAgICAgICAgICAgIHN1Y2Nlc3NCZWZvcmUgPSBmYWxzZTtcbiAgICAgICAgICAgIGxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoZW1lID0gZmFsc2U7XG4gICAgICAgICAgICB1cGRhdGVVSUJhc2VkT25TdGF0ZSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICBsb2FkaW5nQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdsb2FkaW5nQnV0dG9uIGNsaWNrZWQnKTtcbiAgICAgICAgICAgIGF1dGhvcml6ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIG5vdEF1dGhvcml6ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHN1Y2Nlc3MgPSBmYWxzZTtcbiAgICAgICAgICAgIHN1Y2Nlc3NCZWZvcmUgPSBmYWxzZTtcbiAgICAgICAgICAgIGxvYWRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgdGhlbWUgPSBmYWxzZTtcbiAgICAgICAgICAgIHVwZGF0ZVVJQmFzZWRPblN0YXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxhbmdCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2xhbmdCdXR0b24gY2xpY2tlZCcpO1xuICAgICAgICAgICAgaWYgKGxvY2FsZSA9PT0gJ3VrJykge1xuICAgICAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oJ2xvY2FsZScsICdlbicpO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobG9jYWxlID09PSAnZW4nKSB7XG4gICAgICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbSgnbG9jYWxlJywgJ3VrJyk7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhlbWVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QudG9nZ2xlKCdkYXJrJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWwgVUkgdXBkYXRlXG4gICAgICAgIHVwZGF0ZVVJQmFzZWRPblN0YXRlKCk7XG5cbiAgICAgICAgY29uc3Qgc3RhcnRWZXJpZmljYXRpb25UaW1lciA9ICh0b3RhbFNlY29uZHMsIGZvcm0pID0+IHtcbiAgICAgICAgICAgIGlmIChmb3JtID09PSBGT1JNUy5DT05GSVJNQVRJT04pIHtcbiAgICAgICAgICAgICAgICBjb25maXJtQnV0dG9uLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjb25maXJtQnV0dG9uLnRleHRDb250ZW50ID0gJ9Cd0JDQlNCG0KHQm9CQ0KLQmCc7XG4gICAgICAgICAgICAgICAgY29uZmlybUJ1dHRvbi5zZXRBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgICAgICAgICdkYXRhLXRyYW5zbGF0ZScsXG4gICAgICAgICAgICAgICAgICAgICdzZW5kQ29uZmlybWF0aW9uQ29kZSdcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodmVyaWZpY2F0aW9uVGltZXIpIHtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHZlcmlmaWNhdGlvblRpbWVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IHRpbWVMZWZ0ID0gdG90YWxTZWNvbmRzO1xuICAgICAgICAgICAgZGF5TG9jayA9IHRvdGFsU2Vjb25kcyA+IDMwMDtcbiAgICAgICAgICAgIGxldCBtZXNzYWdlID0gJyc7XG5cbiAgICAgICAgICAgIGlmIChkYXlMb2NrKSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IFtcbiAgICAgICAgICAgICAgICAgICAgYCR7TWF0aC5mbG9vcih0aW1lTGVmdCAvIDM2MDApXG4gICAgICAgICAgICAgICAgICAgICAgICAudG9TdHJpbmcoKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnBhZFN0YXJ0KDIsICcwJyl9OiR7TWF0aC5mbG9vcigodGltZUxlZnQgJSAzNjAwKSAvIDYwKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnRvU3RyaW5nKClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5wYWRTdGFydCgyLCAnMCcpfTokeyh0aW1lTGVmdCAlIDYwKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnRvU3RyaW5nKClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5wYWRTdGFydCgyLCAnMCcpfWAsXG4gICAgICAgICAgICAgICAgICAgIEVSUk9SX01FU1NBR0VTLlZFUklGSUNBVElPTl9MT0NLRUQubWVzc2FnZSxcbiAgICAgICAgICAgICAgICBdO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghZGF5TG9jayAmJiBzdGVwLnZlcmlmaWNhdGlvbikge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBbXG4gICAgICAgICAgICAgICAgICAgIGAke01hdGguZmxvb3IodGltZUxlZnQgLyA2MClcbiAgICAgICAgICAgICAgICAgICAgICAgIC50b1N0cmluZygpXG4gICAgICAgICAgICAgICAgICAgICAgICAucGFkU3RhcnQoMiwgJzAnKX06JHsodGltZUxlZnQgJSA2MClcbiAgICAgICAgICAgICAgICAgICAgICAgIC50b1N0cmluZygpXG4gICAgICAgICAgICAgICAgICAgICAgICAucGFkU3RhcnQoMiwgJzAnKX1gLFxuICAgICAgICAgICAgICAgICAgICBFUlJPUl9NRVNTQUdFUy5WRVJJRklDQVRJT05fTE9DS0VELm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIWRheUxvY2spIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gW1xuICAgICAgICAgICAgICAgICAgICBgJHtNYXRoLmZsb29yKHRpbWVMZWZ0IC8gNjApXG4gICAgICAgICAgICAgICAgICAgICAgICAudG9TdHJpbmcoKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnBhZFN0YXJ0KDIsICcwJyl9OiR7KHRpbWVMZWZ0ICUgNjApXG4gICAgICAgICAgICAgICAgICAgICAgICAudG9TdHJpbmcoKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnBhZFN0YXJ0KDIsICcwJyl9YCxcbiAgICAgICAgICAgICAgICAgICAgRVJST1JfTUVTU0FHRVMuU01TX0NPREVfVElNRVIubWVzc2FnZSxcbiAgICAgICAgICAgICAgICBdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB0YXJnZXRGb3JtID1cbiAgICAgICAgICAgICAgICBmb3JtID09PSBGT1JNUy5WRVJJRklDQVRJT05cbiAgICAgICAgICAgICAgICAgICAgPyB2ZXJpZmljYXRpb25Gb3JtXG4gICAgICAgICAgICAgICAgICAgIDogY29uZmlybWF0aW9uRm9ybTtcblxuICAgICAgICAgICAgc2hvd0lucHV0TWVzc2FnZShcbiAgICAgICAgICAgICAgICBtZXNzYWdlLFxuICAgICAgICAgICAgICAgIHRhcmdldEZvcm0sXG4gICAgICAgICAgICAgICAgZGF5TG9jayB8fCAoIWRheUxvY2sgJiYgc3RlcC52ZXJpZmljYXRpb24pID8gJ2Vycm9yJyA6IGZhbHNlXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICBjb25zdCB0aW1lckVsZW1lbnQgPSB0YXJnZXRGb3JtLnF1ZXJ5U2VsZWN0b3IoJy50aW1lcicpO1xuXG4gICAgICAgICAgICB2ZXJpZmljYXRpb25UaW1lciA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGltZUxlZnQgPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHZlcmlmaWNhdGlvblRpbWVyKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoc3RlcC52ZXJpZmljYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Ym1pdEJ1dHRvbi5kaXNhYmxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlRXhpc3RpbmdNZXNzYWdlcyh2ZXJpZmljYXRpb25Gb3JtKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpcm1CdXR0b24uZGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpcm1CdXR0b24udGV4dENvbnRlbnQgPSAn0J3QkNCU0IbQodCb0JDQotCYINCf0J7QktCi0J7QoNCd0J4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlybUJ1dHRvbi5zZXRBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2RhdGEtdHJhbnNsYXRlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAncmVzZW5kQ29uZmlybWF0aW9uQ29kZSdcbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maXJtYXRpb25Db2RlSW5wdXQuc2V0QXR0cmlidXRlKCdyZXF1aXJlZCcsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpcm1hdGlvbkNvZGVJbnB1dC52YWx1ZSA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlybWF0aW9uRm9ybS5kYXRhc2V0LmNvbmZpcm1hdGlvbkV4cGlyZWQgPSAndHJ1ZSc7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW1vdmVFeGlzdGluZ01lc3NhZ2VzKGNvbmZpcm1hdGlvbkZvcm0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvd0lucHV0TWVzc2FnZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBFUlJPUl9NRVNTQUdFUy5WRVJJRklDQVRJT05fRVhQSVJFRC5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpcm1hdGlvbkZvcm0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2Vycm9yJ1xuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvL1VwZGF0aW5nIHRpbWVyIHZhbHVlcyBmb3IgZXZlcnkgc2Vjb25kXG4gICAgICAgICAgICAgICAgaWYgKHRpbWVyRWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGF5TG9jaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGltZXJFbGVtZW50LnRleHRDb250ZW50ID0gYCR7TWF0aC5mbG9vcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lTGVmdCAvIDM2MDBcbiAgICAgICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAudG9TdHJpbmcoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5wYWRTdGFydCgyLCAnMCcpfToke01hdGguZmxvb3IoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKHRpbWVMZWZ0ICUgMzYwMCkgLyA2MFxuICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50b1N0cmluZygpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnBhZFN0YXJ0KDIsICcwJyl9OiR7KHRpbWVMZWZ0ICUgNjApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRvU3RyaW5nKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAucGFkU3RhcnQoMiwgJzAnKX1gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGltZXJFbGVtZW50LnRleHRDb250ZW50ID0gYCR7TWF0aC5mbG9vcih0aW1lTGVmdCAvIDYwKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50b1N0cmluZygpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnBhZFN0YXJ0KDIsICcwJyl9OiR7KHRpbWVMZWZ0ICUgNjApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRvU3RyaW5nKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAucGFkU3RhcnQoMiwgJzAnKX1gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGltZUxlZnQtLTtcbiAgICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGhhbmRsZVZlcmlmaWNhdGlvblJlc3BvbnNlID0gKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAvLyBDbGVhbiB1cCBleHBpcmVkIHN0YXRlIGlmIHdlJ3JlIHN0YXJ0aW5nIGEgbmV3IHZlcmlmaWNhdGlvblxuICAgICAgICAgICAgaWYgKGNvbmZpcm1hdGlvbkZvcm0uZGF0YXNldC5jb25maXJtYXRpb25FeHBpcmVkID09PSAndHJ1ZScpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhbGxNZXNzYWdlcyA9XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpcm1hdGlvbkZvcm0ucXVlcnlTZWxlY3RvckFsbCgnLmlucHV0LW1zZycpO1xuICAgICAgICAgICAgICAgIGFsbE1lc3NhZ2VzLmZvckVhY2goKG1zZykgPT4gbXNnLnJlbW92ZSgpKTtcbiAgICAgICAgICAgICAgICBjb25maXJtYXRpb25Gb3JtLmRhdGFzZXQuY29uZmlybWF0aW9uRXhwaXJlZCA9ICdmYWxzZSc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vRm9yIHN1Y2Nlc3NmdWwgdmVyaWZpY2F0aW9uIGF0dGVtcHRcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvblNlc3Npb24gPSByZXNwb25zZS5kYXRhLnNlc3Npb25faWQ7XG4gICAgICAgICAgICAgICAgLy8gT25seSBoYW5kbGUgZm9ybSB2aXNpYmlsaXR5IGlmIGl0J3MgaGlkZGVuXG4gICAgICAgICAgICAgICAgaWYgKGNvbmZpcm1hdGlvbkZvcm0uY2xhc3NMaXN0LmNvbnRhaW5zKCdoaWRkZW4nKSkge1xuICAgICAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25Gb3JtLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25Gb3JtLmNsYXNzTGlzdC5yZW1vdmUoJ3Zpc2libGUnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlybWF0aW9uRm9ybS5jbGFzc0xpc3QuYWRkKCd2aXNpYmxlJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpcm1hdGlvbkZvcm0uY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBjb25maXJtYXRpb24gY29kZSBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICAgICAgICBjb25maXJtYXRpb25Gb3JtLmNsYXNzTGlzdC5hZGQoJ2NvZGUtcGxhY2Vob2xkZXInKTtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlybWF0aW9uRm9ybS5zZXRBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAnZGF0YS1wbGFjZWhvbGRlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAnXyBfIF8gXyBfJ1xuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdGVwLnZlcmlmaWNhdGlvbiA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHN0ZXAuY29uZmlybWF0aW9uID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAvLyBTdGFydCB0aW1lciBmb3IgY29kZSB2ZXJpZmljYXRpb25cbiAgICAgICAgICAgICAgICBjb25zdCB0dGwgPSByZXNwb25zZS5kYXRhLnBob25lX3ZlcmlmaWNhdGlvbl90dGw7XG4gICAgICAgICAgICAgICAgc3RhcnRWZXJpZmljYXRpb25UaW1lcih0dGwsIEZPUk1TLkNPTkZJUk1BVElPTik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgICAgICAgIHJlc3BvbnNlLmNvZGUgPT09IC0yNCAmJlxuICAgICAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2UucmVhc29uID09PSAndmVyaWZpY2F0aW9uX2xvY2tlZCdcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgcmVzdF90aW1lIH0gPSByZXNwb25zZS5tZXNzYWdlO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1dHRvbiA9IHN0ZXAudmVyaWZpY2F0aW9uID8gc3VibWl0QnV0dG9uIDogY29uZmlybUJ1dHRvbjtcbiAgICAgICAgICAgICAgICBjb25zdCBpbnB1dCA9IHN0ZXAudmVyaWZpY2F0aW9uXG4gICAgICAgICAgICAgICAgICAgID8gcGhvbmVJbnB1dFxuICAgICAgICAgICAgICAgICAgICA6IGNvbmZpcm1hdGlvbkNvZGVJbnB1dDtcbiAgICAgICAgICAgICAgICBjb25zdCBmb3JtID0gc3RlcC52ZXJpZmljYXRpb25cbiAgICAgICAgICAgICAgICAgICAgPyBGT1JNUy5WRVJJRklDQVRJT05cbiAgICAgICAgICAgICAgICAgICAgOiBGT1JNUy5DT05GSVJNQVRJT047XG4gICAgICAgICAgICAgICAgLy8gQ2xlYW4gdXAgZXhpc3RpbmcgbWVzc2FnZXMgYmVmb3JlIHNob3dpbmcgbG9ja2VkIHN0YXRlXG4gICAgICAgICAgICAgICAgcmVtb3ZlRXhpc3RpbmdNZXNzYWdlcyhcbiAgICAgICAgICAgICAgICAgICAgZm9ybSA9PT0gRk9STVMuVkVSSUZJQ0FUSU9OXG4gICAgICAgICAgICAgICAgICAgICAgICA/IHZlcmlmaWNhdGlvbkZvcm1cbiAgICAgICAgICAgICAgICAgICAgICAgIDogY29uZmlybWF0aW9uRm9ybVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgYnV0dG9uLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpbnB1dC5kaXNhYmxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgc3RlcC5jb25maXJtYXRpb24gPyAoaW5wdXQudmFsdWUgPSAnJykgOiBudWxsO1xuICAgICAgICAgICAgICAgIHN0YXJ0VmVyaWZpY2F0aW9uVGltZXIocmVzdF90aW1lLCBmb3JtKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgICAgICAgcmVzcG9uc2UuY29kZSA9PT0gLTI0ICYmXG4gICAgICAgICAgICAgICAgcmVzcG9uc2UubWVzc2FnZS5yZWFzb24gPT09XG4gICAgICAgICAgICAgICAgICAgICdwaG9uZV9udW1iZXJfaGFzX2JlZW5fY29uZmlybWVkX2J5X2Fub3RoZXJfdXNlcidcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIHNob3dJbnB1dE1lc3NhZ2UoXG4gICAgICAgICAgICAgICAgICAgIEVSUk9SX01FU1NBR0VTLlBIT05FX0NPTkZJUk1FRF9CWV9BTk9USEVSLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvbkZvcm0sXG4gICAgICAgICAgICAgICAgICAgICdlcnJvcidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgICAgICByZXNwb25zZS5jb2RlID09PSAtNCAmJlxuICAgICAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2UucmVhc29uID09PSAnd3Jvbmdfc2Vzc2lvbl9vcl9jb25maXJtX2NvZGUnXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICBjb25maXJtQnV0dG9uLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjb25maXJtYXRpb25Db2RlSW5wdXQudmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgICBzaG93SW5wdXRNZXNzYWdlKFxuICAgICAgICAgICAgICAgICAgICBFUlJPUl9NRVNTQUdFUy5JTlZBTElEX0NPTkZJUk1BVElPTl9DT0RFLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpcm1hdGlvbkZvcm0sXG4gICAgICAgICAgICAgICAgICAgICdlcnJvcidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgICAgICByZXNwb25zZS5jb2RlID09PSAtMjQgJiZcbiAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlLnJlYXNvbiA9PT0gJ2NvbmZpcm1fY29kZV9sb2NrZWQnXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAvLyBDbGVhbiB1cCBhbGwgZXhpc3RpbmcgbWVzc2FnZXMgYmVmb3JlIHNob3dpbmcgbG9ja2VkIHN0YXRlXG4gICAgICAgICAgICAgICAgcmVtb3ZlRXhpc3RpbmdNZXNzYWdlcyhjb25maXJtYXRpb25Gb3JtKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHsgcmVzdF90aW1lIH0gPSByZXNwb25zZS5tZXNzYWdlO1xuICAgICAgICAgICAgICAgIGNvbmZpcm1CdXR0b24uZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGNvbmZpcm1hdGlvbkNvZGVJbnB1dC5kaXNhYmxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgY29uZmlybWF0aW9uQ29kZUlucHV0LnZhbHVlID0gJyc7XG4gICAgICAgICAgICAgICAgc3RhcnRWZXJpZmljYXRpb25UaW1lcihyZXN0X3RpbWUsIEZPUk1TLkNPTkZJUk1BVElPTik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy9Vc2VyIHN0YXJ0cyB0byBjaGFuZ2UgcGhvbmUgbnVtYmVyXG4gICAgICAgIHBob25lSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgc3VibWl0QnV0dG9uLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIC8vIFJlbW92ZSBpcy1pbnZhbGlkIGNsYXNzIGluaXRpYWxseVxuICAgICAgICAgICAgcGhvbmVJbnB1dC5jbGFzc0xpc3QucmVtb3ZlKCdpcy1pbnZhbGlkJyk7XG5cbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZS50YXJnZXQudmFsdWU7XG4gICAgICAgICAgICAvLyBPbmx5IGFsbG93ICsgYW5kIG51bWJlcnNcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gdmFsdWUucmVwbGFjZSgvW14rMC05XS9nLCAnJyk7XG5cbiAgICAgICAgICAgIGlmICghbmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICBlLnRhcmdldC52YWx1ZSA9ICcrMzgwJztcbiAgICAgICAgICAgICAgICBlLnRhcmdldC5zZXRTZWxlY3Rpb25SYW5nZSg0LCA0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZS50YXJnZXQudmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVmFsaWRhdGUgcGhvbmUgbnVtYmVyXG4gICAgICAgICAgICBpZiAoIWlzUGhvbmVWYWxpZCh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBwaG9uZUlucHV0LmNsYXNzTGlzdC5hZGQoJ2lzLWludmFsaWQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3VibWl0QnV0dG9uLmRpc2FibGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZS50YXJnZXQudmFsdWUuc2xpY2UoMSkgPT09IHVzZXJQaG9uZU51bWJlcikge1xuICAgICAgICAgICAgICAgIHN1Ym1pdEJ1dHRvbi5pbm5lckhUTUwgPSAn0J/QhtCU0KLQktCV0KDQlNCY0KLQmCc7XG4gICAgICAgICAgICAgICAgc3VibWl0QnV0dG9uLnNldEF0dHJpYnV0ZSgnZGF0YS10cmFuc2xhdGUnLCAnY29uZmlybScpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdWJtaXRCdXR0b24uaW5uZXJIVE1MID0gJ9CX0JHQldCg0JXQk9Ci0JgnO1xuICAgICAgICAgICAgICAgIHN1Ym1pdEJ1dHRvbi5zZXRBdHRyaWJ1dGUoJ2RhdGEtdHJhbnNsYXRlJywgJ3NhdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uZmlybWF0aW9uQ29kZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbmZpcm1CdXR0b24uZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgY29uZmlybWF0aW9uQ29kZUlucHV0LmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWludmFsaWQnKTtcbiAgICAgICAgICAgIGNvbnN0IGNvZGUgPSBlLnRhcmdldC52YWx1ZTtcbiAgICAgICAgICAgIC8vIE9ubHkgYWxsb3cgbnVtYmVyc1xuICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBjb2RlLnJlcGxhY2UoL1teMC05XS9nLCAnJyk7XG5cbiAgICAgICAgICAgIGlmIChjb2RlICE9PSBuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgIGUudGFyZ2V0LnZhbHVlID0gbmV3VmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBVcGRhdGUgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgIGNvbnN0IHBhcmVudFdyYXBwZXIgPSBjb25maXJtYXRpb25Db2RlSW5wdXQucGFyZW50RWxlbWVudDtcblxuICAgICAgICAgICAgaWYgKCFwYXJlbnRXcmFwcGVyLmNsYXNzTGlzdC5jb250YWlucygnY29kZS1wbGFjZWhvbGRlcicpKSB7XG4gICAgICAgICAgICAgICAgcGFyZW50V3JhcHBlci5jbGFzc0xpc3QuYWRkKCdjb2RlLXBsYWNlaG9sZGVyJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSBkeW5hbWljIHBsYWNlaG9sZGVyIGFuZCBzZXQgaXQgYXMgYSBkYXRhIGF0dHJpYnV0ZSBvbiB0aGUgd3JhcHBlclxuICAgICAgICAgICAgY29uc3QgcGxhY2Vob2xkZXJWYWx1ZSA9IEFycmF5KDUpXG4gICAgICAgICAgICAgICAgLmZpbGwoJ18nKVxuICAgICAgICAgICAgICAgIC5tYXAoKGNoYXIsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgYSBudW1iZXIgYXQgdGhpcyBpbmRleCwgcmV0dXJuIGl0IHdpdGhvdXQgc3BhY2VcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4IDwgbmV3VmFsdWUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3VmFsdWVbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIEZvciB0aGUgZmlyc3QgdW5kZXJzY29yZSBhZnRlciBudW1iZXJzLCBkb24ndCBhZGQgc3BhY2UgYmVmb3JlIGl0XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PT0gbmV3VmFsdWUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ18nO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIEZvciByZW1haW5pbmcgdW5kZXJzY29yZXMsIGFkZCBzcGFjZSBiZWZvcmUgdGhlbVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJyBfJztcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5qb2luKCcnKTtcblxuICAgICAgICAgICAgcGFyZW50V3JhcHBlci5zZXRBdHRyaWJ1dGUoJ2RhdGEtcGxhY2Vob2xkZXInLCBwbGFjZWhvbGRlclZhbHVlKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIG9ubHkgdGhlIGVycm9yIG1lc3NhZ2UgaWYgaXQgZXhpc3RzLCBrZWVwaW5nIHRpbWVyIG1lc3NhZ2VcbiAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGNvbmZpcm1hdGlvbkZvcm0ucXVlcnlTZWxlY3RvcihcbiAgICAgICAgICAgICAgICAnW2RhdGEtY29kZS1lcnJvcj1cInRydWVcIl0nXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgaWYgKGVycm9yTWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZS5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCEvXlxcZHs1fSQvLnRlc3QoY29kZSkpIHtcbiAgICAgICAgICAgICAgICBjb25maXJtYXRpb25Db2RlSW5wdXQuY2xhc3NMaXN0LmFkZCgnaXMtaW52YWxpZCcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25maXJtQnV0dG9uLmRpc2FibGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFVzZXIgc3VibWl0cyB2ZXJpZmljYXRpb24gZm9ybVxuICAgICAgICB2ZXJpZmljYXRpb25Gb3JtLmFkZEV2ZW50TGlzdGVuZXIoJ3N1Ym1pdCcsIGFzeW5jIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgICAnJWMgRm9ybSBzdWJtaXR0ZWQnLFxuICAgICAgICAgICAgICAgICdjb2xvcjogI2ZmMDBmZjsgZm9udC13ZWlnaHQ6IGJvbGQnLFxuICAgICAgICAgICAgICAgIGVcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBzdGVwLnZlcmlmaWNhdGlvbiA9IHRydWU7XG4gICAgICAgICAgICBzdWJtaXRCdXR0b24uZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgc3VibWl0dGVkUGhvbmUgPSBlLnRhcmdldFswXS52YWx1ZTtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCB1c2VySWQgPSB1c2VyLmRhdGEuYWNjb3VudC5pZDtcbiAgICAgICAgICAgICAgICBjb25zdCB1c2VyRGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuXG4gICAgICAgICAgICAgICAgdXNlckRhdGEuYXBwZW5kKCdwaG9uZScsIHN1Ym1pdHRlZFBob25lKTtcbiAgICAgICAgICAgICAgICB1c2VyRGF0YS5hcHBlbmQoJ3VzZXJpZCcsIHVzZXJJZCk7XG5cbiAgICAgICAgICAgICAgICAvL0NoYW5nZSB1c2VyIHBob25lIG51bWJlclxuICAgICAgICAgICAgICAgIGlmIChzdWJtaXR0ZWRQaG9uZSAhPT0gYCske3VzZXJQaG9uZU51bWJlcn1gKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdUUlkgQ0hBTkdFIFVTRVIgUEhPTkUtLS1WRVJJRiBGT1JNJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgY2hhbmdlVXNlclBob25lKHVzZXJEYXRhKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZXJyb3IgPT09ICdubycgJiYgIXJlc3BvbnNlLmVycm9yX2NvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZUV4aXN0aW5nTWVzc2FnZXModmVyaWZpY2F0aW9uRm9ybSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZXJQaG9uZU51bWJlciA9IHJlc3BvbnNlLnBob25lLnNsaWNlKDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VibWl0QnV0dG9uLmlubmVySFRNTCA9ICfQn9CG0JTQotCS0JXQoNCU0JjQotCYJztcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Ym1pdEJ1dHRvbi5kaXNhYmxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZXJyb3IgPT09ICd5ZXMnICYmXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5lcnJvcl9jb2RlID09PSAnYWNjb3VudGluZ19lcnJvcl8wMidcbiAgICAgICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWJtaXRCdXR0b24uZGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3dJbnB1dE1lc3NhZ2UoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRVJST1JfTUVTU0FHRVMuUEhPTkVfQUxSRUFEWV9VU0VELm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyaWZpY2F0aW9uRm9ybSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZXJyb3InXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvL1ZlcmlmeSB1c2VyIHBob25lIG51bWJlclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdUUlkgVkVSSUZZIFVTRVIgUEhPTkUtLS1WRVJJRiBGT1JNJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB2ZXJpZnlVc2VyUGhvbmUoY2lkKTtcblxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVWZXJpZmljYXRpb25SZXNwb25zZShyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgcmVzcG9uc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdWZXJpZmljYXRpb24gcHJvY2VzcyBmYWlsZWQ6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIHN1Ym1pdEJ1dHRvbi5kaXNhYmxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgY29uZmlybWF0aW9uIGZvcm0gaGFuZGxlclxuICAgICAgICBjb25maXJtYXRpb25Gb3JtLmFkZEV2ZW50TGlzdGVuZXIoJ3N1Ym1pdCcsIGFzeW5jIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBzdGVwLnZlcmlmaWNhdGlvbiA9IGZhbHNlO1xuICAgICAgICAgICAgc3RlcC5jb25maXJtYXRpb24gPSB0cnVlO1xuICAgICAgICAgICAgY29uZmlybUJ1dHRvbi5kaXNhYmxlZCA9IHRydWU7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHZlcmlmaWNhdGlvbiBoYXMgZXhwaXJlZFxuICAgICAgICAgICAgaWYgKGNvbmZpcm1hdGlvbkZvcm0uZGF0YXNldC5jb25maXJtYXRpb25FeHBpcmVkID09PSAndHJ1ZScpIHtcbiAgICAgICAgICAgICAgICAvLyBSZXNldCB0aGUgZm9ybSBzdGF0ZVxuICAgICAgICAgICAgICAgIGNvbmZpcm1hdGlvbkNvZGVJbnB1dC5kaXNhYmxlZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBuZXcgdmVyaWZpY2F0aW9uXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1RSWSBWRVJJRlkgVVNFUiBQSE9ORS0tLUNPTkYgRk9STScpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHZlcmlmeVVzZXJQaG9uZShjaWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZVZlcmlmaWNhdGlvblJlc3BvbnNlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHJlc2VuZGluZyB2ZXJpZmljYXRpb24gY29kZTonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBjb2RlID0gY29uZmlybWF0aW9uQ29kZUlucHV0LnZhbHVlO1xuXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdUUlkgQ09ORklSTSBVU0VSIFBIT05FLS0tQ09ORiBGT1JNJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBjb25maXJtVXNlclBob25lKFxuICAgICAgICAgICAgICAgICAgICBjb2RlLFxuICAgICAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25TZXNzaW9uXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0Rm9ybUNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICAgICAgZm9ybUNvbnRhaW5lclN1Y2Nlc3MuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8hIEFkZCB2ZXJpZmljYXRpb24gcmVjb3JkXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVzZXJJZCA9IHVzZXIuZGF0YS5hY2NvdW50LmlkO1xuXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGFkZFZlcmlmaWNhdGlvbih7XG4gICAgICAgICAgICAgICAgICAgICAgICB1c2VyaWQ6IHVzZXJJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBob25lOiBzdWJtaXR0ZWRQaG9uZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjb25maXJtaW5nIGNvZGU6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIGhhbmRsZVZlcmlmaWNhdGlvblJlc3BvbnNlKGVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNQaG9uZVZhbGlkKHBob25lKSB7XG4gICAgICAgIGNvbnN0IHBob25lUmVnZXggPSAvXlxcKzM4MFxcZHs5fSQvO1xuICAgICAgICByZXR1cm4gcGhvbmVSZWdleC50ZXN0KHBob25lKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZW1vdmVFeGlzdGluZ01lc3NhZ2VzKHRhcmdldEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgZXhpc3RpbmdNZXNzYWdlcyA9IHRhcmdldEVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmlucHV0LW1zZycpO1xuICAgICAgICBleGlzdGluZ01lc3NhZ2VzLmZvckVhY2goKG1zZykgPT4gbXNnLnJlbW92ZSgpKTtcbiAgICB9XG5cbiAgICBsb2FkVHJhbnNsYXRpb25zKCkudGhlbihpbml0KTtcblxuICAgIGNvbnN0IG1haW5QYWdlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmZhdl9fcGFnZScpO1xuICAgIHNldFRpbWVvdXQoKCkgPT4gbWFpblBhZ2UuY2xhc3NMaXN0LmFkZCgnb3ZlcmZsb3cnKSwgMTAwMCk7XG59KSgpO1xuIl19
