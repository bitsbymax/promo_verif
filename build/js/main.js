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
    const loadingElement = document.querySelector('.loading__wrapper');

    //Test buttons
    const authorizedButton = document.querySelector('.button-authorized');
    const notAuthorizedButton = document.querySelector('.button-notAuthorized');
    const successButton = document.querySelector('.button-success');
    const successBeforeButton = document.querySelector('.button-successBefore');
    const codeFormButton = document.querySelector('.button-codeForm');
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
    let codeForm = false;

    async function init() {
        console.log('%c init() fired', 'color: #00ff00; font-weight: bold');

        // const showLoading = (form) => {
        //     switch (form) {
        //         case FORMS.VERIFICATION:
        //             verificationForm.classList.add('hidden');
        //             break;
        //         case FORMS.CONFIRMATION:
        //             confirmationForm.classList.add('hidden');
        //             break;
        //     }
        //     loadingElement.classList.remove('hidden');
        // };

        // const hideLoading = (form) => {
        //     switch (form) {
        //         case FORMS.VERIFICATION:
        //             verificationForm.classList.remove('hidden');
        //             break;
        //         case FORMS.CONFIRMATION:
        //             confirmationForm.classList.remove('hidden');
        //             break;
        //     }
        //     loadingElement.classList.add('hidden');
        // };

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
                codeForm
            });
            const formContainer = document.querySelector('.form__container');

            if (notAuthorized) {
                console.log('not authorized');
                formWrapper?.classList.add('hidden');
                formContainer?.classList.remove('hidden');
                linkButtonWrapper?.classList.remove('hidden');
                formContainerSuccessBefore?.classList.add('hidden');
                formContainerSuccess?.classList.add('hidden');
                loadingWrapper?.classList.add('hidden');
                confirmationForm?.classList.add('hidden');
            } else if (authorized) {
                console.log('authorized');
                formContainerSuccessBefore?.classList.add('hidden');
                formContainerSuccess?.classList.add('hidden');
                formContainer?.classList.remove('hidden');
                linkButtonWrapper?.classList.add('hidden');
                formWrapper?.classList.remove('hidden');
                verificationForm?.classList.remove('hidden');
                loadingWrapper?.classList.add('hidden');
                confirmationForm?.classList.add('hidden');
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
                formWrapper?.classList.remove('hidden');
                verificationForm?.classList.add('hidden');
                linkButtonWrapper?.classList.add('hidden');
                loadingWrapper?.classList.remove('hidden');
                confirmationForm?.classList.add('hidden');
            } else if (codeForm) {
                formContainerSuccessBefore?.classList.add('hidden');
                formContainerSuccess?.classList.add('hidden');
                formContainer?.classList.remove('hidden');
                formWrapper?.classList.remove('hidden');
                verificationForm?.classList.add('hidden');
                linkButtonWrapper?.classList.add('hidden');
                loadingWrapper?.classList.add('hidden');
                confirmationForm?.classList.remove('hidden');
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

        codeFormButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('codeFormButton clicked');
            authorized = false;
            notAuthorized = false;
            success = false;
            successBefore = false;
            loading = false;
            theme = false;
            codeForm = true;
            updateUIBasedOnState();
        });

        // Initial UI update
        updateUIBasedOnState();

        const startVerificationTimer = (totalSeconds, form) => {
            if (form === FORMS.CONFIRMATION && totalSeconds < 300) {
                confirmButton.disabled = true;
                confirmButton.textContent = 'НАДІСЛАТИ';
                confirmButton.setAttribute(
                    'data-translate',
                    'sendConfirmationCode'
                );
                confirmationCodeInput.disabled = false;
                confirmationCodeInput.setAttribute('required', true);
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
                        phoneInput.disabled = false;
                        removeExistingMessages(verificationForm);
                    } else {
                        confirmButton.disabled = false;
                        confirmButton.textContent = 'НАДІСЛАТИ ПОВТОРНО';
                        confirmButton.setAttribute(
                            'data-translate',
                            'resendConfirmationCode'
                        );
                        confirmationCodeInput.setAttribute('required', false);
                        confirmationCodeInput.disabled = true;
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
                    const response = await changeUserPhone(userData);

                    if (response.error === 'no' && !response.error_code) {
                        removeExistingMessages(verificationForm);

                        userPhoneNumber = response.phone.slice(1);
                        submitButton.innerHTML = 'ПІДТВЕРДИТИ';
                        submitButton.disabled = false;
                        verificationForm.classList.add('success-change');
                        setTimeout(() => {
                            verificationForm.classList.remove('success-change');
                        }, 4000);
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
                showLoading(FORMS.VERIFICATION);
                const response = await verifyUserPhone(cid);

                if (response) {
                    hideLoading(FORMS.VERIFICATION);
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
                // Trigger new verification
                try {
                    showLoading(FORMS.CONFIRMATION);
                    const response = await verifyUserPhone(cid);
                    if (response) {
                        hideLoading(FORMS.CONFIRMATION);
                        handleVerificationResponse(response);
                    }
                } catch (error) {
                    console.error('Error resending verification code:', error);
                }

                return;
            }

            const code = confirmationCodeInput.value;

            try {
                showLoading(FORMS.CONFIRMATION);
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
                hideLoading(FORMS.CONFIRMATION);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiAoKSB7XG4gICAgY29uc3QgRVJST1JfTUVTU0FHRVMgPSB7XG4gICAgICAgIElOVkFMSURfUEhPTkVfRk9STUFUOiB7XG4gICAgICAgICAgICBtZXNzYWdlOiAn0KTQvtGA0LzQsNGCINGC0LXQu9C10YTQvtC90YMg0LLQutCw0LfQsNC90L4g0L3QtdC/0YDQsNCy0LjQu9GM0L3QvicsXG4gICAgICAgICAgICB0cmFuc2xhdGVLZXk6ICdlcnJvckludmFsaWRQaG9uZUZvcm1hdCcsXG4gICAgICAgIH0sXG4gICAgICAgIFBIT05FX0FMUkVBRFlfVVNFRDoge1xuICAgICAgICAgICAgbWVzc2FnZTogJ9Cm0LXQuSDQvdC+0LzQtdGAINGC0LXQu9C10YTQvtC90YMg0LLQttC1INCy0LjQutC+0YDQuNGB0YLQvtCy0YPRlNGC0YzRgdGPJyxcbiAgICAgICAgICAgIHRyYW5zbGF0ZUtleTogJ2Vycm9yUGhvbmVBbHJlYWR5VXNlZCcsXG4gICAgICAgIH0sXG4gICAgICAgIFBIT05FX0NPTkZJUk1FRF9CWV9BTk9USEVSOiB7XG4gICAgICAgICAgICBtZXNzYWdlOiAn0KbQtdC5INC90L7QvNC10YAg0YLQtdC70LXRhNC+0L3RgyDQsdGD0LvQviDQv9GW0LTRgtCy0LXRgNC00LbQtdC90L4g0ZbQvdGI0LjQvCDQutC+0YDQuNGB0YLRg9Cy0LDRh9C10LwnLFxuICAgICAgICAgICAgdHJhbnNsYXRlS2V5OiAnZXJyb3JQaG9uZUNvbmZpcm1lZEJ5QW5vdGhlcicsXG4gICAgICAgIH0sXG4gICAgICAgIFZFUklGSUNBVElPTl9FWFBJUkVEOiB7XG4gICAgICAgICAgICBtZXNzYWdlOiAn0KfQsNGBINCy0LXRgNC40YTRltC60LDRhtGW0Zcg0LzQuNC90YPQsicsXG4gICAgICAgICAgICB0cmFuc2xhdGVLZXk6ICdlcnJvclZlcmlmaWNhdGlvbkV4cGlyZWQnLFxuICAgICAgICB9LFxuICAgICAgICBJTlZBTElEX0NPTkZJUk1BVElPTl9DT0RFOiB7XG4gICAgICAgICAgICBtZXNzYWdlOiAn0J3QtdC/0YDQsNCy0LjQu9GM0L3QuNC5INC60L7QtCDQv9GW0LTRgtCy0LXRgNC00LbQtdC90L3RjycsXG4gICAgICAgICAgICB0cmFuc2xhdGVLZXk6ICdlcnJvckludmFsaWRDb25maXJtYXRpb25Db2RlJyxcbiAgICAgICAgfSxcbiAgICAgICAgVkVSSUZJQ0FUSU9OX0xPQ0tFRDoge1xuICAgICAgICAgICAgbWVzc2FnZTogJ9Cy0LXRgNC40YTRltC60LDRhtGW0Y4g0LfQsNCx0LvQvtC60L7QstCw0L3Qvi4g0JTQvtGH0LXQutCw0LnRgtC10YHRjCDQvtC90L7QstC70LXQvdC90Y8g0YLQsNC50LzQtdGA0LAnLFxuICAgICAgICAgICAgdHJhbnNsYXRlS2V5OiAnZXJyb3JWZXJpZmljYXRpb25Mb2NrZWQnLFxuICAgICAgICB9LFxuICAgICAgICBTTVNfQ09ERV9USU1FUjoge1xuICAgICAgICAgICAgbWVzc2FnZTpcbiAgICAgICAgICAgICAgICAn0YfQsNGBLCDRj9C60LjQuSDQt9Cw0LvQuNGI0LjQstGB0Y8sINGJ0L7QsSDQstCy0LXRgdGC0Lgg0LrQvtC0INC3IFNNUy3Qv9C+0LLRltC00L7QvNC70LXQvdC90Y8uINCf0ZbRgdC70Y8g0LfQsNC60ZbQvdGH0LXQvdC90Y8g0YfQsNGB0YMg0LzQvtC20L3QsCDQt9Cw0L/RgNC+0YHQuNGC0Lgg0LrQvtC0INC/0L7QstGC0L7RgNC90L4nLFxuICAgICAgICAgICAgdHJhbnNsYXRlS2V5OiAnc21zQ29kZVRpbWVyJyxcbiAgICAgICAgfSxcbiAgICB9O1xuICAgIGNvbnN0IEZPUk1TID0ge1xuICAgICAgICBDT05GSVJNQVRJT046ICdjb25maXJtYXRpb24nLFxuICAgICAgICBWRVJJRklDQVRJT046ICd2ZXJpZmljYXRpb24nLFxuICAgIH07XG4gICAgY29uc3QgQVBJID0gJ2h0dHBzOi8vZmF2LXByb20uY29tJztcbiAgICBjb25zdCBFTkRQT0lOVCA9ICdhcGlfdmVyaWZpY2F0aW9uJztcblxuICAgIC8vICNyZWdpb24gVHJhbnNsYXRpb25cbiAgICBjb25zdCB1a0xlbmcgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjdWtMZW5nJyk7XG4gICAgY29uc3QgZW5MZW5nID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2VuTGVuZycpO1xuICAgIGxldCBpMThuRGF0YSA9IHt9O1xuICAgIC8vIGxldCBsb2NhbGUgPSAndWsnO1xuICAgIC8vbG9jYWxlIHRlc3RcbiAgICBsZXQgbG9jYWxlID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbSgnbG9jYWxlJylcbiAgICAgICAgPyBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKCdsb2NhbGUnKVxuICAgICAgICA6ICd1ayc7XG4gICAgaWYgKHVrTGVuZykgbG9jYWxlID0gJ3VrJztcbiAgICBpZiAoZW5MZW5nKSBsb2NhbGUgPSAnZW4nO1xuXG4gICAgZnVuY3Rpb24gbG9hZFRyYW5zbGF0aW9ucygpIHtcbiAgICAgICAgcmV0dXJuIGZldGNoKGAke0FQSX0vJHtFTkRQT0lOVH0vdHJhbnNsYXRlcy8ke2xvY2FsZX1gKVxuICAgICAgICAgICAgLnRoZW4oKHJlcykgPT4gcmVzLmpzb24oKSlcbiAgICAgICAgICAgIC50aGVuKChqc29uKSA9PiB7XG4gICAgICAgICAgICAgICAgaTE4bkRhdGEgPSBqc29uO1xuICAgICAgICAgICAgICAgIHRyYW5zbGF0ZSgpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgbXV0YXRpb25PYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGZ1bmN0aW9uIChcbiAgICAgICAgICAgICAgICAgICAgbXV0YXRpb25zXG4gICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyYW5zbGF0ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIG11dGF0aW9uT2JzZXJ2ZXIub2JzZXJ2ZShcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ZlcmlmaWNhdGlvbicpLFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGlsZExpc3Q6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWJ0cmVlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyYW5zbGF0ZSgpIHtcbiAgICAgICAgY29uc3QgZWxlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS10cmFuc2xhdGVdJyk7XG4gICAgICAgIGlmIChlbGVtcyAmJiBlbGVtcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGVsZW1zLmZvckVhY2goKGVsZW0pID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBrZXkgPSBlbGVtLmdldEF0dHJpYnV0ZSgnZGF0YS10cmFuc2xhdGUnKTtcbiAgICAgICAgICAgICAgICBlbGVtLmlubmVySFRNTCA9IHRyYW5zbGF0ZUtleShrZXkpO1xuICAgICAgICAgICAgICAgIGVsZW0ucmVtb3ZlQXR0cmlidXRlKCdkYXRhLXRyYW5zbGF0ZScpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobG9jYWxlID09PSAnZW4nKSB7XG4gICAgICAgICAgICBtYWluUGFnZS5jbGFzc0xpc3QuYWRkKCdlbicpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVmcmVzaExvY2FsaXplZENsYXNzKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHJhbnNsYXRlS2V5KGtleSkge1xuICAgICAgICBpZiAoIWtleSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBpMThuRGF0YVtrZXldIHx8ICcqLS0tLU5FRUQgVE8gQkUgVFJBTlNMQVRFRC0tLS0qICAga2V5OiAgJyArIGtleVxuICAgICAgICApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlZnJlc2hMb2NhbGl6ZWRDbGFzcyhlbGVtZW50LCBiYXNlQ3NzQ2xhc3MpIHtcbiAgICAgICAgaWYgKCFlbGVtZW50KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBsYW5nIG9mIFsndWsnLCAnZW4nXSkge1xuICAgICAgICAgICAgZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKGJhc2VDc3NDbGFzcyArIGxhbmcpO1xuICAgICAgICB9XG4gICAgICAgIGVsZW1lbnQuY2xhc3NMaXN0LmFkZChiYXNlQ3NzQ2xhc3MgKyBsb2NhbGUpO1xuICAgIH1cblxuICAgIC8vICNlbmRyZWdpb25cblxuICAgIGFzeW5jIGZ1bmN0aW9uIGdldFVzZXIoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXMgPSBhd2FpdCB3aW5kb3cuRkUuc29ja2V0X3NlbmQoe1xuICAgICAgICAgICAgICAgIGNtZDogJ2dldF91c2VyJyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2dldFVzZXIgcmVzcG9uc2UnLCByZXMpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGZldGNoaW5nIHVzZXI6JywgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBmdW5jdGlvbiB2ZXJpZnlVc2VyUGhvbmUoY2lkKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXMgPSBhd2FpdCB3aW5kb3cuRkUuc29ja2V0X3NlbmQoe1xuICAgICAgICAgICAgICAgIGNtZDogJ2FjY291bnRpbmcvdXNlcl9waG9uZV92ZXJpZnknLFxuICAgICAgICAgICAgICAgIGNpZCxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3ZlcmlmeVVzZXJQaG9uZSByZXNwb25zZScsIHJlcyk7XG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgdmVyaWZ5aW5nIHVzZXIgcGhvbmU6JywgZXJyb3IpO1xuXG4gICAgICAgICAgICByZXR1cm4gZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBmdW5jdGlvbiBjaGFuZ2VVc2VyUGhvbmUodXNlckRhdGEpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goJy9hY2NvdW50aW5nL2FwaS9jaGFuZ2VfdXNlcicsIHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBib2R5OiB1c2VyRGF0YSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjaGFuZ2VVc2VyUGhvbmUgcmVzcG9uc2U6JywgZGF0YSk7XG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGNoYW5naW5nIHVzZXIgcGhvbmU6JywgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBmdW5jdGlvbiBjb25maXJtVXNlclBob25lKGNvbmZpcm1Db2RlLCBzZXNzaW9uSWQpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IHdpbmRvdy5GRS5zb2NrZXRfc2VuZCh7XG4gICAgICAgICAgICAgICAgY21kOiAnYWNjb3VudGluZy91c2VyX3Bob25lX2NvbmZpcm0nLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlybV9jb2RlOiBgJHtjb25maXJtQ29kZX1gLFxuICAgICAgICAgICAgICAgICAgICBzZXNzaW9uX2lkOiBgJHtzZXNzaW9uSWR9YCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjb25maXJtVXNlclBob25lIHJlc3BvbnNlJywgcmVzKTtcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjb25maXJtaW5nIHVzZXIgcGhvbmU6JywgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBmdW5jdGlvbiBhZGRWZXJpZmljYXRpb24oZGF0YSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgZmV0Y2goYCR7QVBJfS8ke0VORFBPSU5UfWAsIHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShkYXRhKSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgYWRkaW5nIHZlcmlmaWNhdGlvbjonLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGxldCBkYXlMb2NrID0gZmFsc2U7XG5cbiAgICBmdW5jdGlvbiBzaG93SW5wdXRNZXNzYWdlKG1lc3NhZ2UsIHRhcmdldEVsZW1lbnQsIHN0YXRlID0gZmFsc2UpIHtcbiAgICAgICAgY29uc3QgaW5wdXRFbGVtZW50ID0gdGFyZ2V0RWxlbWVudC5xdWVyeVNlbGVjdG9yKCdpbnB1dCcpO1xuICAgICAgICBjb25zdCBidXR0b25FbGVtZW50ID0gdGFyZ2V0RWxlbWVudC5xdWVyeVNlbGVjdG9yKCdidXR0b24nKTtcbiAgICAgICAgZG9jdW1lbnRcbiAgICAgICAgICAgIC5nZXRFbGVtZW50QnlJZCgnY29uZmlybWF0aW9uX19mb3JtJylcbiAgICAgICAgICAgIC5zZXRBdHRyaWJ1dGUoJ2RhdGEtcGxhY2Vob2xkZXInLCAnJyk7XG4gICAgICAgIC8vIEZpbmQgZXJyb3IgbWVzc2FnZSBvYmplY3QgaWYgaXQgZXhpc3RzXG4gICAgICAgIGxldCBlcnJvck9iaiA9IG51bGw7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIEVSUk9SX01FU1NBR0VTKSB7XG4gICAgICAgICAgICBpZiAoRVJST1JfTUVTU0FHRVNba2V5XS5tZXNzYWdlID09PSBtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgZXJyb3JPYmogPSBFUlJPUl9NRVNTQUdFU1trZXldO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGV4aXN0aW5nTWVzc2FnZXMgPSB0YXJnZXRFbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5pbnB1dC1tc2cnKTtcbiAgICAgICAgY29uc3QgaXNUaW1lck1lc3NhZ2UgPSBBcnJheS5pc0FycmF5KG1lc3NhZ2UpICYmIG1lc3NhZ2UubGVuZ3RoID09PSAyO1xuICAgICAgICAvLyBDaGVjayBmb3IgZXhpc3RpbmcgbWVzc2FnZXMgd2l0aCB0aGUgc2FtZSBjb250ZW50XG4gICAgICAgIGZvciAoY29uc3QgbXNnIG9mIGV4aXN0aW5nTWVzc2FnZXMpIHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSB0aW1lciBtZXNzYWdlIHJlcGxhY2VtZW50XG4gICAgICAgICAgICBpZiAoaXNUaW1lck1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0aW1lcldyYXBwZXIgPSBtc2cucXVlcnlTZWxlY3RvcignLnRpbWVyV3JhcHBlcicpO1xuICAgICAgICAgICAgICAgIGlmICh0aW1lcldyYXBwZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhpcyBpcyBhIG5ldyB0aW1lciBtZXNzYWdlIGFuZCB3ZSBmb3VuZCBhbiBleGlzdGluZyB0aW1lclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0aW1lciA9IHRpbWVyV3JhcHBlci5xdWVyeVNlbGVjdG9yKCcudGltZXInKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRpbWVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lci50ZXh0Q29udGVudCA9IG1lc3NhZ2VbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47IC8vIEV4aXQgYWZ0ZXIgdXBkYXRpbmcgZXhpc3RpbmcgdGltZXJcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBEb24ndCByZW1vdmUgdGltZXIgbWVzc2FnZSBpZiBpdCBleGlzdHMgYW5kIHdlJ3JlIHNob3dpbmcgYSBkaWZmZXJlbnQgbWVzc2FnZVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtc2cudGV4dENvbnRlbnQgPT09IG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47IC8vIEV4aXQgaWYgbm9uLXRpbWVyIG1lc3NhZ2UgYWxyZWFkeSBleGlzdHNcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFJlbW92ZSBub24tdGltZXIgbWVzc2FnZXMgb3Igb2xkIHRpbWVyIG1lc3NhZ2VzIGlmIHdlJ3JlIHNob3dpbmcgYSBuZXcgdGltZXJcbiAgICAgICAgICAgIGlmICghbXNnLnF1ZXJ5U2VsZWN0b3IoJy50aW1lcldyYXBwZXInKSB8fCBpc1RpbWVyTWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIG1zZy5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSBuZXcgbWVzc2FnZSBlbGVtZW50XG4gICAgICAgIGNvbnN0IG1lc3NhZ2VFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIG1lc3NhZ2VFbGVtZW50LmNsYXNzTGlzdC5hZGQoJ2lucHV0LW1zZycpO1xuXG4gICAgICAgIGlmIChpc1RpbWVyTWVzc2FnZSkge1xuICAgICAgICAgICAgLy8gQ3JlYXRlIHRpbWVyIHdyYXBwZXIgc3RydWN0dXJlXG4gICAgICAgICAgICBjb25zdCB0aW1lcldyYXBwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIHRpbWVyV3JhcHBlci5jbGFzc0xpc3QuYWRkKCd0aW1lcldyYXBwZXInKTtcbiAgICAgICAgICAgIC8vIFNldCBtaW4td2lkdGggYmFzZWQgb24gbG9jayB0eXBlXG4gICAgICAgICAgICB0aW1lcldyYXBwZXIuc3R5bGUubWluV2lkdGggPSBkYXlMb2NrID8gJzYzcHgnIDogJzQ1cHgnO1xuICAgICAgICAgICAgLy8gQ3JlYXRlIGFuZCBzZXR1cCB0aW1lciBlbGVtZW50XG4gICAgICAgICAgICBjb25zdCB0aW1lckVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICB0aW1lckVsZW1lbnQudGV4dENvbnRlbnQgPSBtZXNzYWdlWzBdO1xuICAgICAgICAgICAgdGltZXJFbGVtZW50LmNsYXNzTGlzdC5hZGQoJ3RpbWVyJyk7XG4gICAgICAgICAgICB0aW1lcldyYXBwZXIuYXBwZW5kQ2hpbGQodGltZXJFbGVtZW50KTtcbiAgICAgICAgICAgIC8vIENyZWF0ZSBhbmQgc2V0dXAgbWVzc2FnZSBlbGVtZW50XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlVGV4dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIG1lc3NhZ2VUZXh0LnRleHRDb250ZW50ID0gbWVzc2FnZVsxXTtcbiAgICAgICAgICAgIG1lc3NhZ2VUZXh0LmNsYXNzTGlzdC5hZGQoc3RhdGUgPyAnZXJyb3InIDogJ3dhcm5pbmcnKTtcbiAgICAgICAgICAgIC8vIEhhbmRsZSB0cmFuc2xhdGlvbiBrZXlzXG4gICAgICAgICAgICBpZiAobWVzc2FnZVsxXSA9PT0gRVJST1JfTUVTU0FHRVMuVkVSSUZJQ0FUSU9OX0xPQ0tFRC5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZVRleHQuc2V0QXR0cmlidXRlKFxuICAgICAgICAgICAgICAgICAgICAnZGF0YS10cmFuc2xhdGUnLFxuICAgICAgICAgICAgICAgICAgICBFUlJPUl9NRVNTQUdFUy5WRVJJRklDQVRJT05fTE9DS0VELnRyYW5zbGF0ZUtleVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2VbMV0gPT09IEVSUk9SX01FU1NBR0VTLlNNU19DT0RFX1RJTUVSLm1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlVGV4dC5zZXRBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgICAgICAgICdkYXRhLXRyYW5zbGF0ZScsXG4gICAgICAgICAgICAgICAgICAgIEVSUk9SX01FU1NBR0VTLlNNU19DT0RFX1RJTUVSLnRyYW5zbGF0ZUtleVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBBc3NlbWJsZSB0aGUgbWVzc2FnZSBzdHJ1Y3R1cmVcbiAgICAgICAgICAgIG1lc3NhZ2VFbGVtZW50LmFwcGVuZENoaWxkKHRpbWVyV3JhcHBlcik7XG4gICAgICAgICAgICBtZXNzYWdlRWxlbWVudC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnICcpKTtcbiAgICAgICAgICAgIG1lc3NhZ2VFbGVtZW50LmFwcGVuZENoaWxkKG1lc3NhZ2VUZXh0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1lc3NhZ2VFbGVtZW50LnRleHRDb250ZW50ID0gbWVzc2FnZTtcbiAgICAgICAgICAgIC8vIEFkZCB0cmFuc2xhdGlvbiBrZXkgaWYgZXJyb3IgbWVzc2FnZSBleGlzdHMgaW4gb3VyIHN0cnVjdHVyZVxuICAgICAgICAgICAgaWYgKGVycm9yT2JqKSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZUVsZW1lbnQuc2V0QXR0cmlidXRlKFxuICAgICAgICAgICAgICAgICAgICAnZGF0YS10cmFuc2xhdGUnLFxuICAgICAgICAgICAgICAgICAgICBlcnJvck9iai50cmFuc2xhdGVLZXlcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgbWVzc2FnZUVsZW1lbnQuY2xhc3NMaXN0LmFkZChzdGF0ZSA/ICdlcnJvcicgOiAnd2FybmluZycpO1xuXG4gICAgICAgIC8vIEhhbmRsZSBtZXNzYWdlIHBvc2l0aW9uaW5nXG4gICAgICAgIGlmIChtZXNzYWdlID09PSBFUlJPUl9NRVNTQUdFUy5JTlZBTElEX0NPTkZJUk1BVElPTl9DT0RFLm1lc3NhZ2UpIHtcbiAgICAgICAgICAgIG1lc3NhZ2VFbGVtZW50LnNldEF0dHJpYnV0ZSgnZGF0YS1jb2RlLWVycm9yJywgJ3RydWUnKTtcbiAgICAgICAgICAgIC8vIEFsd2F5cyBpbnNlcnQgZXJyb3IgbWVzc2FnZXMgYXQgdGhlIHRvcFxuICAgICAgICAgICAgaW5wdXRFbGVtZW50LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKFxuICAgICAgICAgICAgICAgIG1lc3NhZ2VFbGVtZW50LFxuICAgICAgICAgICAgICAgIGlucHV0RWxlbWVudC5uZXh0U2libGluZ1xuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIC8vIE1vdmUgYW55IGV4aXN0aW5nIG5vbi1lcnJvciBtZXNzYWdlcyBiZWxvdyB0aGlzIG9uZVxuICAgICAgICAgICAgY29uc3Qgb3RoZXJNZXNzYWdlcyA9IHRhcmdldEVsZW1lbnQucXVlcnlTZWxlY3RvckFsbChcbiAgICAgICAgICAgICAgICAnLmlucHV0LW1zZzpub3QoW2RhdGEtY29kZS1lcnJvcl0pJ1xuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIG90aGVyTWVzc2FnZXMuZm9yRWFjaCgobXNnKSA9PiB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZUVsZW1lbnQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoXG4gICAgICAgICAgICAgICAgICAgIG1zZyxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZUVsZW1lbnQubmV4dFNpYmxpbmdcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGb3Igbm9uLWVycm9yIG1lc3NhZ2VzLCBpbnNlcnQgYWZ0ZXIgYW55IGV4aXN0aW5nIGVycm9yIG1lc3NhZ2UsIG9yIGJlZm9yZSB0aGUgYnV0dG9uXG4gICAgICAgICAgICBjb25zdCBleGlzdGluZ0Vycm9yTXNnID1cbiAgICAgICAgICAgICAgICB0YXJnZXRFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWNvZGUtZXJyb3JdJyk7XG4gICAgICAgICAgICBjb25zdCBpbnNlcnRCZWZvcmUgPSBleGlzdGluZ0Vycm9yTXNnXG4gICAgICAgICAgICAgICAgPyBleGlzdGluZ0Vycm9yTXNnLm5leHRTaWJsaW5nXG4gICAgICAgICAgICAgICAgOiBidXR0b25FbGVtZW50O1xuICAgICAgICAgICAgaW5wdXRFbGVtZW50LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG1lc3NhZ2VFbGVtZW50LCBpbnNlcnRCZWZvcmUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcGhvbmVJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwaG9uZScpO1xuICAgIGNvbnN0IGNvbmZpcm1hdGlvbkNvZGVJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb25maXJtYXRpb24tY29kZScpO1xuICAgIGNvbnN0IHZlcmlmaWNhdGlvbkZvcm0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndmVyaWZpY2F0aW9uX19mb3JtJyk7XG4gICAgY29uc3QgY29uZmlybWF0aW9uRm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb25maXJtYXRpb25fX2Zvcm0nKTtcbiAgICBjb25zdCBsaW5rQnV0dG9uV3JhcHBlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5saW5rX19idXR0b24td3JhcHBlcicpO1xuICAgIGNvbnN0IHN1Ym1pdEJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzdWJtaXQtYnV0dG9uJyk7XG4gICAgY29uc3QgY29uZmlybUJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb25maXJtLWJ1dHRvbicpO1xuICAgIGNvbnN0IGZvcm1XcmFwcGVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmZvcm1fX3dyYXBwZXInKTtcbiAgICBjb25zdCBsb2FkaW5nV3JhcHBlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5sb2FkaW5nX193cmFwcGVyJyk7XG4gICAgY29uc3QgZGVmYXVsdEZvcm1Db250YWluZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuZm9ybV9fY29udGFpbmVyJyk7XG4gICAgY29uc3QgZm9ybUNvbnRhaW5lclN1Y2Nlc3NCZWZvcmUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFxuICAgICAgICAnLmZvcm1fX2NvbnRhaW5lci1zdWNjZXNzQmVmb3JlJ1xuICAgICk7XG4gICAgY29uc3QgZm9ybUNvbnRhaW5lclN1Y2Nlc3MgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFxuICAgICAgICAnLmZvcm1fX2NvbnRhaW5lci1zdWNjZXNzJ1xuICAgICk7XG4gICAgY29uc3QgbG9hZGluZ0VsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubG9hZGluZ19fd3JhcHBlcicpO1xuXG4gICAgLy9UZXN0IGJ1dHRvbnNcbiAgICBjb25zdCBhdXRob3JpemVkQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmJ1dHRvbi1hdXRob3JpemVkJyk7XG4gICAgY29uc3Qgbm90QXV0aG9yaXplZEJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5idXR0b24tbm90QXV0aG9yaXplZCcpO1xuICAgIGNvbnN0IHN1Y2Nlc3NCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYnV0dG9uLXN1Y2Nlc3MnKTtcbiAgICBjb25zdCBzdWNjZXNzQmVmb3JlQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmJ1dHRvbi1zdWNjZXNzQmVmb3JlJyk7XG4gICAgY29uc3QgY29kZUZvcm1CdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYnV0dG9uLWNvZGVGb3JtJyk7XG4gICAgY29uc3QgbGFuZ0J1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5idXR0b24tbGFuZycpO1xuICAgIGNvbnN0IHRoZW1lQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmJ1dHRvbi10aGVtZScpO1xuICAgIGNvbnN0IGxvYWRpbmdCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYnV0dG9uLWxvYWRpbmcnKTtcblxuICAgIC8vU3RhdGVzXG4gICAgbGV0IGF1dGhvcml6ZWQgPSBmYWxzZTtcbiAgICBsZXQgbm90QXV0aG9yaXplZCA9IHRydWU7XG4gICAgbGV0IHN1Y2Nlc3MgPSBmYWxzZTtcbiAgICBsZXQgc3VjY2Vzc0JlZm9yZSA9IGZhbHNlO1xuICAgIGxldCBsb2FkaW5nID0gZmFsc2U7XG4gICAgbGV0IHRoZW1lID0gZmFsc2U7XG4gICAgbGV0IGNvZGVGb3JtID0gZmFsc2U7XG5cbiAgICBhc3luYyBmdW5jdGlvbiBpbml0KCkge1xuICAgICAgICBjb25zb2xlLmxvZygnJWMgaW5pdCgpIGZpcmVkJywgJ2NvbG9yOiAjMDBmZjAwOyBmb250LXdlaWdodDogYm9sZCcpO1xuXG4gICAgICAgIC8vIGNvbnN0IHNob3dMb2FkaW5nID0gKGZvcm0pID0+IHtcbiAgICAgICAgLy8gICAgIHN3aXRjaCAoZm9ybSkge1xuICAgICAgICAvLyAgICAgICAgIGNhc2UgRk9STVMuVkVSSUZJQ0FUSU9OOlxuICAgICAgICAvLyAgICAgICAgICAgICB2ZXJpZmljYXRpb25Gb3JtLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgICAgICAvLyAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gICAgICAgICBjYXNlIEZPUk1TLkNPTkZJUk1BVElPTjpcbiAgICAgICAgLy8gICAgICAgICAgICAgY29uZmlybWF0aW9uRm9ybS5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgLy8gICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vICAgICB9XG4gICAgICAgIC8vICAgICBsb2FkaW5nRWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICAgICAgLy8gfTtcblxuICAgICAgICAvLyBjb25zdCBoaWRlTG9hZGluZyA9IChmb3JtKSA9PiB7XG4gICAgICAgIC8vICAgICBzd2l0Y2ggKGZvcm0pIHtcbiAgICAgICAgLy8gICAgICAgICBjYXNlIEZPUk1TLlZFUklGSUNBVElPTjpcbiAgICAgICAgLy8gICAgICAgICAgICAgdmVyaWZpY2F0aW9uRm9ybS5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICAgICAgLy8gICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vICAgICAgICAgY2FzZSBGT1JNUy5DT05GSVJNQVRJT046XG4gICAgICAgIC8vICAgICAgICAgICAgIGNvbmZpcm1hdGlvbkZvcm0uY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG4gICAgICAgIC8vICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyAgICAgfVxuICAgICAgICAvLyAgICAgbG9hZGluZ0VsZW1lbnQuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgICAgIC8vIH07XG5cbiAgICAgICAgLy8gaWYgKHdpbmRvdy5GRT8udXNlci5yb2xlID09PSAnZ3Vlc3QnKSB7XG4gICAgICAgIC8vICAgICBmb3JtV3JhcHBlci5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgLy8gICAgIGxpbmtCdXR0b25XcmFwcGVyLmNsYXNzTGlzdC5hZGQoJ3Zpc2libGUnKTtcbiAgICAgICAgLy8gICAgIGxpbmtCdXR0b25XcmFwcGVyLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuXG4gICAgICAgIC8vICAgICByZXR1cm47XG4gICAgICAgIC8vIH1cblxuICAgICAgICAvLyBsZXQgdXNlclBob25lTnVtYmVyID0gbnVsbDtcbiAgICAgICAgLy8gbGV0IHVzZXJQaG9uZVZlcmlmaWVkID0gZmFsc2U7XG4gICAgICAgIC8vIGxldCB2ZXJpZmljYXRpb25TZXNzaW9uID0gbnVsbDtcbiAgICAgICAgLy8gbGV0IHVzZXIgPSBudWxsO1xuICAgICAgICAvLyBsZXQgY2lkID0gbnVsbDtcbiAgICAgICAgLy8gbGV0IHZlcmlmaWNhdGlvblRpbWVyID0gbnVsbDtcbiAgICAgICAgLy8gbGV0IHN1Ym1pdHRlZFBob25lID0gbnVsbDtcblxuICAgICAgICAvLyBjb25zdCBzdGVwID0ge1xuICAgICAgICAvLyAgICAgY29uZmlybWF0aW9uOiBmYWxzZSxcbiAgICAgICAgLy8gICAgIHZlcmlmaWNhdGlvbjogZmFsc2UsXG4gICAgICAgIC8vIH07XG5cbiAgICAgICAgLy8gdHJ5IHtcbiAgICAgICAgLy8gICAgIHVzZXIgPSBhd2FpdCBnZXRVc2VyKCk7XG4gICAgICAgIC8vICAgICBjaWQgPSB1c2VyLmNpZDtcbiAgICAgICAgLy8gICAgIHVzZXJQaG9uZU51bWJlciA9IHVzZXIuZGF0YS5hY2NvdW50LnBob25lX251bWJlcjtcbiAgICAgICAgLy8gICAgIHVzZXJQaG9uZVZlcmlmaWVkID0gdXNlci5kYXRhLmFjY291bnQuYWNjb3VudF9zdGF0dXMuZmluZChcbiAgICAgICAgLy8gICAgICAgICAoc3RhdHVzKSA9PiBzdGF0dXMuYWxpYXMgPT09ICdJU19QSE9ORV9WRVJJRklFRCdcbiAgICAgICAgLy8gICAgICkudmFsdWU7XG4gICAgICAgIC8vICAgICAvL0NoZWNrIGlmIHVzZXIgaGFzIGEgbnVtYmVyIGFuZCBpcyBhbHJlYWR5IHZlcmlmaWVkXG4gICAgICAgIC8vICAgICBpZiAodXNlclBob25lTnVtYmVyICYmIHVzZXJQaG9uZVZlcmlmaWVkKSB7XG4gICAgICAgIC8vICAgICAgICAgZGVmYXVsdEZvcm1Db250YWluZXIuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgICAgIC8vICAgICAgICAgZm9ybUNvbnRhaW5lclN1Y2Nlc3NCZWZvcmUuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG5cbiAgICAgICAgLy8gICAgICAgICByZXR1cm47XG4gICAgICAgIC8vICAgICB9XG5cbiAgICAgICAgLy8gICAgIHZlcmlmaWNhdGlvbkZvcm0uY2xhc3NMaXN0LmFkZCgndmlzaWJsZScpO1xuICAgICAgICAvLyAgICAgdmVyaWZpY2F0aW9uRm9ybS5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICAgICAgLy8gICAgIHBob25lSW5wdXQudmFsdWUgPSBgKyR7dXNlclBob25lTnVtYmVyfWA7XG4gICAgICAgIC8vIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIC8vICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gZ2V0IHVzZXI6JywgZXJyb3IpO1xuICAgICAgICAvLyB9XG5cbiAgICAgICAgY29uc3QgdXBkYXRlVUlCYXNlZE9uU3RhdGUgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnVXBkYXRpbmcgVUksIHN0YXRlczonLCB7XG4gICAgICAgICAgICAgICAgYXV0aG9yaXplZCxcbiAgICAgICAgICAgICAgICBub3RBdXRob3JpemVkLFxuICAgICAgICAgICAgICAgIHN1Y2Nlc3NCZWZvcmUsXG4gICAgICAgICAgICAgICAgc3VjY2VzcyxcbiAgICAgICAgICAgICAgICBsb2FkaW5nLFxuICAgICAgICAgICAgICAgIHRoZW1lLFxuICAgICAgICAgICAgICAgIGNvZGVGb3JtXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1Db250YWluZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuZm9ybV9fY29udGFpbmVyJyk7XG5cbiAgICAgICAgICAgIGlmIChub3RBdXRob3JpemVkKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vdCBhdXRob3JpemVkJyk7XG4gICAgICAgICAgICAgICAgZm9ybVdyYXBwZXI/LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIGZvcm1Db250YWluZXI/LmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIGxpbmtCdXR0b25XcmFwcGVyPy5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICBmb3JtQ29udGFpbmVyU3VjY2Vzc0JlZm9yZT8uY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgZm9ybUNvbnRhaW5lclN1Y2Nlc3M/LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIGxvYWRpbmdXcmFwcGVyPy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICBjb25maXJtYXRpb25Gb3JtPy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYXV0aG9yaXplZCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdhdXRob3JpemVkJyk7XG4gICAgICAgICAgICAgICAgZm9ybUNvbnRhaW5lclN1Y2Nlc3NCZWZvcmU/LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIGZvcm1Db250YWluZXJTdWNjZXNzPy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICBmb3JtQ29udGFpbmVyPy5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICBsaW5rQnV0dG9uV3JhcHBlcj8uY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgZm9ybVdyYXBwZXI/LmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvbkZvcm0/LmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIGxvYWRpbmdXcmFwcGVyPy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICBjb25maXJtYXRpb25Gb3JtPy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3VjY2Vzc0JlZm9yZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzdWNjZXNzQmVmb3JlJyk7XG4gICAgICAgICAgICAgICAgZm9ybUNvbnRhaW5lcj8uY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgZm9ybUNvbnRhaW5lclN1Y2Nlc3NCZWZvcmU/LmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIGZvcm1Db250YWluZXJTdWNjZXNzPy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzdWNjZXNzJyk7XG4gICAgICAgICAgICAgICAgZm9ybUNvbnRhaW5lcj8uY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgZm9ybUNvbnRhaW5lclN1Y2Nlc3NCZWZvcmU/LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIGZvcm1Db250YWluZXJTdWNjZXNzPy5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobG9hZGluZykge1xuICAgICAgICAgICAgICAgIGZvcm1Db250YWluZXJTdWNjZXNzQmVmb3JlPy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICBmb3JtQ29udGFpbmVyU3VjY2Vzcz8uY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgZm9ybUNvbnRhaW5lcj8uY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgZm9ybVdyYXBwZXI/LmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvbkZvcm0/LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIGxpbmtCdXR0b25XcmFwcGVyPy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICBsb2FkaW5nV3JhcHBlcj8uY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgY29uZmlybWF0aW9uRm9ybT8uY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNvZGVGb3JtKSB7XG4gICAgICAgICAgICAgICAgZm9ybUNvbnRhaW5lclN1Y2Nlc3NCZWZvcmU/LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIGZvcm1Db250YWluZXJTdWNjZXNzPy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICBmb3JtQ29udGFpbmVyPy5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICBmb3JtV3JhcHBlcj8uY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgdmVyaWZpY2F0aW9uRm9ybT8uY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgbGlua0J1dHRvbldyYXBwZXI/LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIGxvYWRpbmdXcmFwcGVyPy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICBjb25maXJtYXRpb25Gb3JtPy5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBhdXRob3JpemVkQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdhdXRob3JpemVkQnV0dG9uIGNsaWNrZWQnKTtcbiAgICAgICAgICAgIGF1dGhvcml6ZWQgPSB0cnVlO1xuICAgICAgICAgICAgbm90QXV0aG9yaXplZCA9IGZhbHNlO1xuICAgICAgICAgICAgc3VjY2VzcyA9IGZhbHNlO1xuICAgICAgICAgICAgc3VjY2Vzc0JlZm9yZSA9IGZhbHNlO1xuICAgICAgICAgICAgbG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgdGhlbWUgPSBmYWxzZTtcbiAgICAgICAgICAgIHVwZGF0ZVVJQmFzZWRPblN0YXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG5vdEF1dGhvcml6ZWRCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ25vdEF1dGhvcml6ZWRCdXR0b24gY2xpY2tlZCcpO1xuICAgICAgICAgICAgYXV0aG9yaXplZCA9IGZhbHNlO1xuICAgICAgICAgICAgbm90QXV0aG9yaXplZCA9IHRydWU7XG4gICAgICAgICAgICBzdWNjZXNzID0gZmFsc2U7XG4gICAgICAgICAgICBzdWNjZXNzQmVmb3JlID0gZmFsc2U7XG4gICAgICAgICAgICBsb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB0aGVtZSA9IGZhbHNlO1xuICAgICAgICAgICAgdXBkYXRlVUlCYXNlZE9uU3RhdGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc3VjY2Vzc0JlZm9yZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc3VjY2Vzc0JlZm9yZUJ1dHRvbiBjbGlja2VkJyk7XG4gICAgICAgICAgICBhdXRob3JpemVkID0gZmFsc2U7XG4gICAgICAgICAgICBub3RBdXRob3JpemVkID0gZmFsc2U7XG4gICAgICAgICAgICBzdWNjZXNzID0gZmFsc2U7XG4gICAgICAgICAgICBzdWNjZXNzQmVmb3JlID0gdHJ1ZTtcbiAgICAgICAgICAgIGxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoZW1lID0gZmFsc2U7XG4gICAgICAgICAgICB1cGRhdGVVSUJhc2VkT25TdGF0ZSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICBzdWNjZXNzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzdWNjZXNzQnV0dG9uIGNsaWNrZWQnKTtcbiAgICAgICAgICAgIGF1dGhvcml6ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIG5vdEF1dGhvcml6ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHN1Y2Nlc3MgPSB0cnVlO1xuICAgICAgICAgICAgc3VjY2Vzc0JlZm9yZSA9IGZhbHNlO1xuICAgICAgICAgICAgbG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgdGhlbWUgPSBmYWxzZTtcbiAgICAgICAgICAgIHVwZGF0ZVVJQmFzZWRPblN0YXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxvYWRpbmdCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2xvYWRpbmdCdXR0b24gY2xpY2tlZCcpO1xuICAgICAgICAgICAgYXV0aG9yaXplZCA9IGZhbHNlO1xuICAgICAgICAgICAgbm90QXV0aG9yaXplZCA9IGZhbHNlO1xuICAgICAgICAgICAgc3VjY2VzcyA9IGZhbHNlO1xuICAgICAgICAgICAgc3VjY2Vzc0JlZm9yZSA9IGZhbHNlO1xuICAgICAgICAgICAgbG9hZGluZyA9IHRydWU7XG4gICAgICAgICAgICB0aGVtZSA9IGZhbHNlO1xuICAgICAgICAgICAgdXBkYXRlVUlCYXNlZE9uU3RhdGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbGFuZ0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnbGFuZ0J1dHRvbiBjbGlja2VkJyk7XG4gICAgICAgICAgICBpZiAobG9jYWxlID09PSAndWsnKSB7XG4gICAgICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbSgnbG9jYWxlJywgJ2VuJyk7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChsb2NhbGUgPT09ICdlbicpIHtcbiAgICAgICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKCdsb2NhbGUnLCAndWsnKTtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGVtZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC50b2dnbGUoJ2RhcmsnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29kZUZvcm1CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2NvZGVGb3JtQnV0dG9uIGNsaWNrZWQnKTtcbiAgICAgICAgICAgIGF1dGhvcml6ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIG5vdEF1dGhvcml6ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHN1Y2Nlc3MgPSBmYWxzZTtcbiAgICAgICAgICAgIHN1Y2Nlc3NCZWZvcmUgPSBmYWxzZTtcbiAgICAgICAgICAgIGxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoZW1lID0gZmFsc2U7XG4gICAgICAgICAgICBjb2RlRm9ybSA9IHRydWU7XG4gICAgICAgICAgICB1cGRhdGVVSUJhc2VkT25TdGF0ZSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsIFVJIHVwZGF0ZVxuICAgICAgICB1cGRhdGVVSUJhc2VkT25TdGF0ZSgpO1xuXG4gICAgICAgIGNvbnN0IHN0YXJ0VmVyaWZpY2F0aW9uVGltZXIgPSAodG90YWxTZWNvbmRzLCBmb3JtKSA9PiB7XG4gICAgICAgICAgICBpZiAoZm9ybSA9PT0gRk9STVMuQ09ORklSTUFUSU9OICYmIHRvdGFsU2Vjb25kcyA8IDMwMCkge1xuICAgICAgICAgICAgICAgIGNvbmZpcm1CdXR0b24uZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGNvbmZpcm1CdXR0b24udGV4dENvbnRlbnQgPSAn0J3QkNCU0IbQodCb0JDQotCYJztcbiAgICAgICAgICAgICAgICBjb25maXJtQnV0dG9uLnNldEF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgICAgICAgJ2RhdGEtdHJhbnNsYXRlJyxcbiAgICAgICAgICAgICAgICAgICAgJ3NlbmRDb25maXJtYXRpb25Db2RlJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgY29uZmlybWF0aW9uQ29kZUlucHV0LmRpc2FibGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgY29uZmlybWF0aW9uQ29kZUlucHV0LnNldEF0dHJpYnV0ZSgncmVxdWlyZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHZlcmlmaWNhdGlvblRpbWVyKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh2ZXJpZmljYXRpb25UaW1lcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCB0aW1lTGVmdCA9IHRvdGFsU2Vjb25kcztcbiAgICAgICAgICAgIGRheUxvY2sgPSB0b3RhbFNlY29uZHMgPiAzMDA7XG4gICAgICAgICAgICBsZXQgbWVzc2FnZSA9ICcnO1xuXG4gICAgICAgICAgICBpZiAoZGF5TG9jaykge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBbXG4gICAgICAgICAgICAgICAgICAgIGAke01hdGguZmxvb3IodGltZUxlZnQgLyAzNjAwKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnRvU3RyaW5nKClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5wYWRTdGFydCgyLCAnMCcpfToke01hdGguZmxvb3IoKHRpbWVMZWZ0ICUgMzYwMCkgLyA2MClcbiAgICAgICAgICAgICAgICAgICAgICAgIC50b1N0cmluZygpXG4gICAgICAgICAgICAgICAgICAgICAgICAucGFkU3RhcnQoMiwgJzAnKX06JHsodGltZUxlZnQgJSA2MClcbiAgICAgICAgICAgICAgICAgICAgICAgIC50b1N0cmluZygpXG4gICAgICAgICAgICAgICAgICAgICAgICAucGFkU3RhcnQoMiwgJzAnKX1gLFxuICAgICAgICAgICAgICAgICAgICBFUlJPUl9NRVNTQUdFUy5WRVJJRklDQVRJT05fTE9DS0VELm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIWRheUxvY2sgJiYgc3RlcC52ZXJpZmljYXRpb24pIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gW1xuICAgICAgICAgICAgICAgICAgICBgJHtNYXRoLmZsb29yKHRpbWVMZWZ0IC8gNjApXG4gICAgICAgICAgICAgICAgICAgICAgICAudG9TdHJpbmcoKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnBhZFN0YXJ0KDIsICcwJyl9OiR7KHRpbWVMZWZ0ICUgNjApXG4gICAgICAgICAgICAgICAgICAgICAgICAudG9TdHJpbmcoKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnBhZFN0YXJ0KDIsICcwJyl9YCxcbiAgICAgICAgICAgICAgICAgICAgRVJST1JfTUVTU0FHRVMuVkVSSUZJQ0FUSU9OX0xPQ0tFRC5tZXNzYWdlLFxuICAgICAgICAgICAgICAgIF07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFkYXlMb2NrKSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IFtcbiAgICAgICAgICAgICAgICAgICAgYCR7TWF0aC5mbG9vcih0aW1lTGVmdCAvIDYwKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnRvU3RyaW5nKClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5wYWRTdGFydCgyLCAnMCcpfTokeyh0aW1lTGVmdCAlIDYwKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnRvU3RyaW5nKClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5wYWRTdGFydCgyLCAnMCcpfWAsXG4gICAgICAgICAgICAgICAgICAgIEVSUk9SX01FU1NBR0VTLlNNU19DT0RFX1RJTUVSLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgdGFyZ2V0Rm9ybSA9XG4gICAgICAgICAgICAgICAgZm9ybSA9PT0gRk9STVMuVkVSSUZJQ0FUSU9OXG4gICAgICAgICAgICAgICAgICAgID8gdmVyaWZpY2F0aW9uRm9ybVxuICAgICAgICAgICAgICAgICAgICA6IGNvbmZpcm1hdGlvbkZvcm07XG5cbiAgICAgICAgICAgIHNob3dJbnB1dE1lc3NhZ2UoXG4gICAgICAgICAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgICAgICAgICB0YXJnZXRGb3JtLFxuICAgICAgICAgICAgICAgIGRheUxvY2sgfHwgKCFkYXlMb2NrICYmIHN0ZXAudmVyaWZpY2F0aW9uKSA/ICdlcnJvcicgOiBmYWxzZVxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgY29uc3QgdGltZXJFbGVtZW50ID0gdGFyZ2V0Rm9ybS5xdWVyeVNlbGVjdG9yKCcudGltZXInKTtcblxuICAgICAgICAgICAgdmVyaWZpY2F0aW9uVGltZXIgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHRpbWVMZWZ0IDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh2ZXJpZmljYXRpb25UaW1lcik7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0ZXAudmVyaWZpY2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWJtaXRCdXR0b24uZGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBob25lSW5wdXQuZGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZUV4aXN0aW5nTWVzc2FnZXModmVyaWZpY2F0aW9uRm9ybSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maXJtQnV0dG9uLmRpc2FibGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maXJtQnV0dG9uLnRleHRDb250ZW50ID0gJ9Cd0JDQlNCG0KHQm9CQ0KLQmCDQn9Ce0JLQotCe0KDQndCeJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpcm1CdXR0b24uc2V0QXR0cmlidXRlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdkYXRhLXRyYW5zbGF0ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3Jlc2VuZENvbmZpcm1hdGlvbkNvZGUnXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlybWF0aW9uQ29kZUlucHV0LnNldEF0dHJpYnV0ZSgncmVxdWlyZWQnLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maXJtYXRpb25Db2RlSW5wdXQuZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlybWF0aW9uQ29kZUlucHV0LnZhbHVlID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maXJtYXRpb25Gb3JtLmRhdGFzZXQuY29uZmlybWF0aW9uRXhwaXJlZCA9ICd0cnVlJztcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZUV4aXN0aW5nTWVzc2FnZXMoY29uZmlybWF0aW9uRm9ybSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93SW5wdXRNZXNzYWdlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVSUk9SX01FU1NBR0VTLlZFUklGSUNBVElPTl9FWFBJUkVELm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlybWF0aW9uRm9ybSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZXJyb3InXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vVXBkYXRpbmcgdGltZXIgdmFsdWVzIGZvciBldmVyeSBzZWNvbmRcbiAgICAgICAgICAgICAgICBpZiAodGltZXJFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXlMb2NrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lckVsZW1lbnQudGV4dENvbnRlbnQgPSBgJHtNYXRoLmZsb29yKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVMZWZ0IC8gMzYwMFxuICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50b1N0cmluZygpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnBhZFN0YXJ0KDIsICcwJyl9OiR7TWF0aC5mbG9vcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAodGltZUxlZnQgJSAzNjAwKSAvIDYwXG4gICAgICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRvU3RyaW5nKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAucGFkU3RhcnQoMiwgJzAnKX06JHsodGltZUxlZnQgJSA2MClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAudG9TdHJpbmcoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5wYWRTdGFydCgyLCAnMCcpfWA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lckVsZW1lbnQudGV4dENvbnRlbnQgPSBgJHtNYXRoLmZsb29yKHRpbWVMZWZ0IC8gNjApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRvU3RyaW5nKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAucGFkU3RhcnQoMiwgJzAnKX06JHsodGltZUxlZnQgJSA2MClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAudG9TdHJpbmcoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5wYWRTdGFydCgyLCAnMCcpfWA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aW1lTGVmdC0tO1xuICAgICAgICAgICAgfSwgMTAwMCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgaGFuZGxlVmVyaWZpY2F0aW9uUmVzcG9uc2UgPSAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIC8vIENsZWFuIHVwIGV4cGlyZWQgc3RhdGUgaWYgd2UncmUgc3RhcnRpbmcgYSBuZXcgdmVyaWZpY2F0aW9uXG4gICAgICAgICAgICBpZiAoY29uZmlybWF0aW9uRm9ybS5kYXRhc2V0LmNvbmZpcm1hdGlvbkV4cGlyZWQgPT09ICd0cnVlJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFsbE1lc3NhZ2VzID1cbiAgICAgICAgICAgICAgICAgICAgY29uZmlybWF0aW9uRm9ybS5xdWVyeVNlbGVjdG9yQWxsKCcuaW5wdXQtbXNnJyk7XG4gICAgICAgICAgICAgICAgYWxsTWVzc2FnZXMuZm9yRWFjaCgobXNnKSA9PiBtc2cucmVtb3ZlKCkpO1xuICAgICAgICAgICAgICAgIGNvbmZpcm1hdGlvbkZvcm0uZGF0YXNldC5jb25maXJtYXRpb25FeHBpcmVkID0gJ2ZhbHNlJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy9Gb3Igc3VjY2Vzc2Z1bCB2ZXJpZmljYXRpb24gYXR0ZW1wdFxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICAgICAgdmVyaWZpY2F0aW9uU2Vzc2lvbiA9IHJlc3BvbnNlLmRhdGEuc2Vzc2lvbl9pZDtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IGhhbmRsZSBmb3JtIHZpc2liaWxpdHkgaWYgaXQncyBoaWRkZW5cbiAgICAgICAgICAgICAgICBpZiAoY29uZmlybWF0aW9uRm9ybS5jbGFzc0xpc3QuY29udGFpbnMoJ2hpZGRlbicpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvbkZvcm0uY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvbkZvcm0uY2xhc3NMaXN0LnJlbW92ZSgndmlzaWJsZScpO1xuICAgICAgICAgICAgICAgICAgICBjb25maXJtYXRpb25Gb3JtLmNsYXNzTGlzdC5hZGQoJ3Zpc2libGUnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlybWF0aW9uRm9ybS5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGNvbmZpcm1hdGlvbiBjb2RlIHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpcm1hdGlvbkZvcm0uY2xhc3NMaXN0LmFkZCgnY29kZS1wbGFjZWhvbGRlcicpO1xuICAgICAgICAgICAgICAgICAgICBjb25maXJtYXRpb25Gb3JtLnNldEF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgICAgICAgICAgICdkYXRhLXBsYWNlaG9sZGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdfIF8gXyBfIF8nXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN0ZXAudmVyaWZpY2F0aW9uID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgc3RlcC5jb25maXJtYXRpb24gPSB0cnVlO1xuICAgICAgICAgICAgICAgIC8vIFN0YXJ0IHRpbWVyIGZvciBjb2RlIHZlcmlmaWNhdGlvblxuICAgICAgICAgICAgICAgIGNvbnN0IHR0bCA9IHJlc3BvbnNlLmRhdGEucGhvbmVfdmVyaWZpY2F0aW9uX3R0bDtcbiAgICAgICAgICAgICAgICBzdGFydFZlcmlmaWNhdGlvblRpbWVyKHR0bCwgRk9STVMuQ09ORklSTUFUSU9OKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgICAgICAgcmVzcG9uc2UuY29kZSA9PT0gLTI0ICYmXG4gICAgICAgICAgICAgICAgcmVzcG9uc2UubWVzc2FnZS5yZWFzb24gPT09ICd2ZXJpZmljYXRpb25fbG9ja2VkJ1xuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyByZXN0X3RpbWUgfSA9IHJlc3BvbnNlLm1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgY29uc3QgYnV0dG9uID0gc3RlcC52ZXJpZmljYXRpb24gPyBzdWJtaXRCdXR0b24gOiBjb25maXJtQnV0dG9uO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlucHV0ID0gc3RlcC52ZXJpZmljYXRpb25cbiAgICAgICAgICAgICAgICAgICAgPyBwaG9uZUlucHV0XG4gICAgICAgICAgICAgICAgICAgIDogY29uZmlybWF0aW9uQ29kZUlucHV0O1xuICAgICAgICAgICAgICAgIGNvbnN0IGZvcm0gPSBzdGVwLnZlcmlmaWNhdGlvblxuICAgICAgICAgICAgICAgICAgICA/IEZPUk1TLlZFUklGSUNBVElPTlxuICAgICAgICAgICAgICAgICAgICA6IEZPUk1TLkNPTkZJUk1BVElPTjtcbiAgICAgICAgICAgICAgICAvLyBDbGVhbiB1cCBleGlzdGluZyBtZXNzYWdlcyBiZWZvcmUgc2hvd2luZyBsb2NrZWQgc3RhdGVcbiAgICAgICAgICAgICAgICByZW1vdmVFeGlzdGluZ01lc3NhZ2VzKFxuICAgICAgICAgICAgICAgICAgICBmb3JtID09PSBGT1JNUy5WRVJJRklDQVRJT05cbiAgICAgICAgICAgICAgICAgICAgICAgID8gdmVyaWZpY2F0aW9uRm9ybVxuICAgICAgICAgICAgICAgICAgICAgICAgOiBjb25maXJtYXRpb25Gb3JtXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBidXR0b24uZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlucHV0LmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBzdGVwLmNvbmZpcm1hdGlvbiA/IChpbnB1dC52YWx1ZSA9ICcnKSA6IG51bGw7XG4gICAgICAgICAgICAgICAgc3RhcnRWZXJpZmljYXRpb25UaW1lcihyZXN0X3RpbWUsIGZvcm0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgICAgICByZXNwb25zZS5jb2RlID09PSAtMjQgJiZcbiAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlLnJlYXNvbiA9PT1cbiAgICAgICAgICAgICAgICAgICAgJ3Bob25lX251bWJlcl9oYXNfYmVlbl9jb25maXJtZWRfYnlfYW5vdGhlcl91c2VyJ1xuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgc2hvd0lucHV0TWVzc2FnZShcbiAgICAgICAgICAgICAgICAgICAgRVJST1JfTUVTU0FHRVMuUEhPTkVfQ09ORklSTUVEX0JZX0FOT1RIRVIubWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgdmVyaWZpY2F0aW9uRm9ybSxcbiAgICAgICAgICAgICAgICAgICAgJ2Vycm9yJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgICAgICAgIHJlc3BvbnNlLmNvZGUgPT09IC00ICYmXG4gICAgICAgICAgICAgICAgcmVzcG9uc2UubWVzc2FnZS5yZWFzb24gPT09ICd3cm9uZ19zZXNzaW9uX29yX2NvbmZpcm1fY29kZSdcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIGNvbmZpcm1CdXR0b24uZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGNvbmZpcm1hdGlvbkNvZGVJbnB1dC52YWx1ZSA9ICcnO1xuICAgICAgICAgICAgICAgIHNob3dJbnB1dE1lc3NhZ2UoXG4gICAgICAgICAgICAgICAgICAgIEVSUk9SX01FU1NBR0VTLklOVkFMSURfQ09ORklSTUFUSU9OX0NPREUubWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgY29uZmlybWF0aW9uRm9ybSxcbiAgICAgICAgICAgICAgICAgICAgJ2Vycm9yJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgICAgICAgIHJlc3BvbnNlLmNvZGUgPT09IC0yNCAmJlxuICAgICAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2UucmVhc29uID09PSAnY29uZmlybV9jb2RlX2xvY2tlZCdcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIC8vIENsZWFuIHVwIGFsbCBleGlzdGluZyBtZXNzYWdlcyBiZWZvcmUgc2hvd2luZyBsb2NrZWQgc3RhdGVcbiAgICAgICAgICAgICAgICByZW1vdmVFeGlzdGluZ01lc3NhZ2VzKGNvbmZpcm1hdGlvbkZvcm0pO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgeyByZXN0X3RpbWUgfSA9IHJlc3BvbnNlLm1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgY29uZmlybUJ1dHRvbi5kaXNhYmxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgY29uZmlybWF0aW9uQ29kZUlucHV0LmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjb25maXJtYXRpb25Db2RlSW5wdXQudmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgICBzdGFydFZlcmlmaWNhdGlvblRpbWVyKHJlc3RfdGltZSwgRk9STVMuQ09ORklSTUFUSU9OKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvL1VzZXIgc3RhcnRzIHRvIGNoYW5nZSBwaG9uZSBudW1iZXJcbiAgICAgICAgcGhvbmVJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsIChlKSA9PiB7XG4gICAgICAgICAgICBzdWJtaXRCdXR0b24uZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgLy8gUmVtb3ZlIGlzLWludmFsaWQgY2xhc3MgaW5pdGlhbGx5XG4gICAgICAgICAgICBwaG9uZUlucHV0LmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWludmFsaWQnKTtcblxuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBlLnRhcmdldC52YWx1ZTtcbiAgICAgICAgICAgIC8vIE9ubHkgYWxsb3cgKyBhbmQgbnVtYmVyc1xuICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC9bXiswLTldL2csICcnKTtcblxuICAgICAgICAgICAgaWYgKCFuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgIGUudGFyZ2V0LnZhbHVlID0gJyszODAnO1xuICAgICAgICAgICAgICAgIGUudGFyZ2V0LnNldFNlbGVjdGlvblJhbmdlKDQsIDQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlLnRhcmdldC52YWx1ZSA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSBwaG9uZSBudW1iZXJcbiAgICAgICAgICAgIGlmICghaXNQaG9uZVZhbGlkKHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHBob25lSW5wdXQuY2xhc3NMaXN0LmFkZCgnaXMtaW52YWxpZCcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdWJtaXRCdXR0b24uZGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChlLnRhcmdldC52YWx1ZS5zbGljZSgxKSA9PT0gdXNlclBob25lTnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgc3VibWl0QnV0dG9uLmlubmVySFRNTCA9ICfQn9CG0JTQotCS0JXQoNCU0JjQotCYJztcbiAgICAgICAgICAgICAgICBzdWJtaXRCdXR0b24uc2V0QXR0cmlidXRlKCdkYXRhLXRyYW5zbGF0ZScsICdjb25maXJtJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN1Ym1pdEJ1dHRvbi5pbm5lckhUTUwgPSAn0JfQkdCV0KDQldCT0KLQmCc7XG4gICAgICAgICAgICAgICAgc3VibWl0QnV0dG9uLnNldEF0dHJpYnV0ZSgnZGF0YS10cmFuc2xhdGUnLCAnc2F2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBjb25maXJtYXRpb25Db2RlSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uZmlybUJ1dHRvbi5kaXNhYmxlZCA9IHRydWU7XG4gICAgICAgICAgICBjb25maXJtYXRpb25Db2RlSW5wdXQuY2xhc3NMaXN0LnJlbW92ZSgnaXMtaW52YWxpZCcpO1xuICAgICAgICAgICAgY29uc3QgY29kZSA9IGUudGFyZ2V0LnZhbHVlO1xuICAgICAgICAgICAgLy8gT25seSBhbGxvdyBudW1iZXJzXG4gICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IGNvZGUucmVwbGFjZSgvW14wLTldL2csICcnKTtcblxuICAgICAgICAgICAgaWYgKGNvZGUgIT09IG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgZS50YXJnZXQudmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwbGFjZWhvbGRlclxuICAgICAgICAgICAgY29uc3QgcGFyZW50V3JhcHBlciA9IGNvbmZpcm1hdGlvbkNvZGVJbnB1dC5wYXJlbnRFbGVtZW50O1xuXG4gICAgICAgICAgICBpZiAoIXBhcmVudFdyYXBwZXIuY2xhc3NMaXN0LmNvbnRhaW5zKCdjb2RlLXBsYWNlaG9sZGVyJykpIHtcbiAgICAgICAgICAgICAgICBwYXJlbnRXcmFwcGVyLmNsYXNzTGlzdC5hZGQoJ2NvZGUtcGxhY2Vob2xkZXInKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ3JlYXRlIGR5bmFtaWMgcGxhY2Vob2xkZXIgYW5kIHNldCBpdCBhcyBhIGRhdGEgYXR0cmlidXRlIG9uIHRoZSB3cmFwcGVyXG4gICAgICAgICAgICBjb25zdCBwbGFjZWhvbGRlclZhbHVlID0gQXJyYXkoNSlcbiAgICAgICAgICAgICAgICAuZmlsbCgnXycpXG4gICAgICAgICAgICAgICAgLm1hcCgoY2hhciwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIG51bWJlciBhdCB0aGlzIGluZGV4LCByZXR1cm4gaXQgd2l0aG91dCBzcGFjZVxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPCBuZXdWYWx1ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXdWYWx1ZVtpbmRleF07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIHRoZSBmaXJzdCB1bmRlcnNjb3JlIGFmdGVyIG51bWJlcnMsIGRvbid0IGFkZCBzcGFjZSBiZWZvcmUgaXRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSBuZXdWYWx1ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnXyc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIHJlbWFpbmluZyB1bmRlcnNjb3JlcywgYWRkIHNwYWNlIGJlZm9yZSB0aGVtXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnIF8nO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmpvaW4oJycpO1xuXG4gICAgICAgICAgICBwYXJlbnRXcmFwcGVyLnNldEF0dHJpYnV0ZSgnZGF0YS1wbGFjZWhvbGRlcicsIHBsYWNlaG9sZGVyVmFsdWUpO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgb25seSB0aGUgZXJyb3IgbWVzc2FnZSBpZiBpdCBleGlzdHMsIGtlZXBpbmcgdGltZXIgbWVzc2FnZVxuICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gY29uZmlybWF0aW9uRm9ybS5xdWVyeVNlbGVjdG9yKFxuICAgICAgICAgICAgICAgICdbZGF0YS1jb2RlLWVycm9yPVwidHJ1ZVwiXSdcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpZiAoZXJyb3JNZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlLnJlbW92ZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIS9eXFxkezV9JC8udGVzdChjb2RlKSkge1xuICAgICAgICAgICAgICAgIGNvbmZpcm1hdGlvbkNvZGVJbnB1dC5jbGFzc0xpc3QuYWRkKCdpcy1pbnZhbGlkJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbmZpcm1CdXR0b24uZGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXNlciBzdWJtaXRzIHZlcmlmaWNhdGlvbiBmb3JtXG4gICAgICAgIHZlcmlmaWNhdGlvbkZvcm0uYWRkRXZlbnRMaXN0ZW5lcignc3VibWl0JywgYXN5bmMgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHN0ZXAudmVyaWZpY2F0aW9uID0gdHJ1ZTtcbiAgICAgICAgICAgIHN1Ym1pdEJ1dHRvbi5kaXNhYmxlZCA9IHRydWU7XG4gICAgICAgICAgICBzdWJtaXR0ZWRQaG9uZSA9IGUudGFyZ2V0WzBdLnZhbHVlO1xuXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVzZXJJZCA9IHVzZXIuZGF0YS5hY2NvdW50LmlkO1xuICAgICAgICAgICAgICAgIGNvbnN0IHVzZXJEYXRhID0gbmV3IEZvcm1EYXRhKCk7XG5cbiAgICAgICAgICAgICAgICB1c2VyRGF0YS5hcHBlbmQoJ3Bob25lJywgc3VibWl0dGVkUGhvbmUpO1xuICAgICAgICAgICAgICAgIHVzZXJEYXRhLmFwcGVuZCgndXNlcmlkJywgdXNlcklkKTtcblxuICAgICAgICAgICAgICAgIC8vQ2hhbmdlIHVzZXIgcGhvbmUgbnVtYmVyXG4gICAgICAgICAgICAgICAgaWYgKHN1Ym1pdHRlZFBob25lICE9PSBgKyR7dXNlclBob25lTnVtYmVyfWApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBjaGFuZ2VVc2VyUGhvbmUodXNlckRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5lcnJvciA9PT0gJ25vJyAmJiAhcmVzcG9uc2UuZXJyb3JfY29kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlRXhpc3RpbmdNZXNzYWdlcyh2ZXJpZmljYXRpb25Gb3JtKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdXNlclBob25lTnVtYmVyID0gcmVzcG9uc2UucGhvbmUuc2xpY2UoMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWJtaXRCdXR0b24uaW5uZXJIVE1MID0gJ9Cf0IbQlNCi0JLQldCg0JTQmNCi0JgnO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VibWl0QnV0dG9uLmRpc2FibGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25Gb3JtLmNsYXNzTGlzdC5hZGQoJ3N1Y2Nlc3MtY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25Gb3JtLmNsYXNzTGlzdC5yZW1vdmUoJ3N1Y2Nlc3MtY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCA0MDAwKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmVycm9yID09PSAneWVzJyAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZXJyb3JfY29kZSA9PT0gJ2FjY291bnRpbmdfZXJyb3JfMDInXG4gICAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VibWl0QnV0dG9uLmRpc2FibGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93SW5wdXRNZXNzYWdlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVSUk9SX01FU1NBR0VTLlBIT05FX0FMUkVBRFlfVVNFRC5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvbkZvcm0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2Vycm9yJ1xuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy9WZXJpZnkgdXNlciBwaG9uZSBudW1iZXJcbiAgICAgICAgICAgICAgICBzaG93TG9hZGluZyhGT1JNUy5WRVJJRklDQVRJT04pO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdmVyaWZ5VXNlclBob25lKGNpZCk7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgaGlkZUxvYWRpbmcoRk9STVMuVkVSSUZJQ0FUSU9OKTtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlVmVyaWZpY2F0aW9uUmVzcG9uc2UocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IHJlc3BvbnNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVmVyaWZpY2F0aW9uIHByb2Nlc3MgZmFpbGVkOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICBzdWJtaXRCdXR0b24uZGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGNvbmZpcm1hdGlvbiBmb3JtIGhhbmRsZXJcbiAgICAgICAgY29uZmlybWF0aW9uRm9ybS5hZGRFdmVudExpc3RlbmVyKCdzdWJtaXQnLCBhc3luYyAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgc3RlcC52ZXJpZmljYXRpb24gPSBmYWxzZTtcbiAgICAgICAgICAgIHN0ZXAuY29uZmlybWF0aW9uID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbmZpcm1CdXR0b24uZGlzYWJsZWQgPSB0cnVlO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB2ZXJpZmljYXRpb24gaGFzIGV4cGlyZWRcbiAgICAgICAgICAgIGlmIChjb25maXJtYXRpb25Gb3JtLmRhdGFzZXQuY29uZmlybWF0aW9uRXhwaXJlZCA9PT0gJ3RydWUnKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBuZXcgdmVyaWZpY2F0aW9uXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgc2hvd0xvYWRpbmcoRk9STVMuQ09ORklSTUFUSU9OKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB2ZXJpZnlVc2VyUGhvbmUoY2lkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoaWRlTG9hZGluZyhGT1JNUy5DT05GSVJNQVRJT04pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlVmVyaWZpY2F0aW9uUmVzcG9uc2UocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgcmVzZW5kaW5nIHZlcmlmaWNhdGlvbiBjb2RlOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGNvZGUgPSBjb25maXJtYXRpb25Db2RlSW5wdXQudmFsdWU7XG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgc2hvd0xvYWRpbmcoRk9STVMuQ09ORklSTUFUSU9OKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGNvbmZpcm1Vc2VyUGhvbmUoXG4gICAgICAgICAgICAgICAgICAgIGNvZGUsXG4gICAgICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvblNlc3Npb25cbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRGb3JtQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgICAgICBmb3JtQ29udGFpbmVyU3VjY2Vzcy5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyEgQWRkIHZlcmlmaWNhdGlvbiByZWNvcmRcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdXNlcklkID0gdXNlci5kYXRhLmFjY291bnQuaWQ7XG5cbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgYWRkVmVyaWZpY2F0aW9uKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZXJpZDogdXNlcklkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGhvbmU6IHN1Ym1pdHRlZFBob25lLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGNvbmZpcm1pbmcgY29kZTonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgaGlkZUxvYWRpbmcoRk9STVMuQ09ORklSTUFUSU9OKTtcbiAgICAgICAgICAgICAgICBoYW5kbGVWZXJpZmljYXRpb25SZXNwb25zZShlcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzUGhvbmVWYWxpZChwaG9uZSkge1xuICAgICAgICBjb25zdCBwaG9uZVJlZ2V4ID0gL15cXCszODBcXGR7OX0kLztcbiAgICAgICAgcmV0dXJuIHBob25lUmVnZXgudGVzdChwaG9uZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVtb3ZlRXhpc3RpbmdNZXNzYWdlcyh0YXJnZXRFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IGV4aXN0aW5nTWVzc2FnZXMgPSB0YXJnZXRFbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5pbnB1dC1tc2cnKTtcbiAgICAgICAgZXhpc3RpbmdNZXNzYWdlcy5mb3JFYWNoKChtc2cpID0+IG1zZy5yZW1vdmUoKSk7XG4gICAgfVxuXG4gICAgbG9hZFRyYW5zbGF0aW9ucygpLnRoZW4oaW5pdCk7XG5cbiAgICBjb25zdCBtYWluUGFnZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5mYXZfX3BhZ2UnKTtcbiAgICBzZXRUaW1lb3V0KCgpID0+IG1haW5QYWdlLmNsYXNzTGlzdC5hZGQoJ292ZXJmbG93JyksIDEwMDApO1xufSkoKTtcbiJdfQ==
