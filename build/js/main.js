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
    // let locale = 'uk';

    //locale test
    let locale = sessionStorage.getItem('locale')
        ? sessionStorage.getItem('locale')
        : 'uk';
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
    const darkTheme = document.querySelector('.button-dark');

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

        darkTheme.addEventListener('click', (e) => {
            e.preventDefault();
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

    loadTranslations().then(init);
    // init();

    const mainPage = document.querySelector('.fav__page');
    setTimeout(() => mainPage.classList.add('overflow'), 1000);
})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gKCkge1xuICAgIGNvbnN0IEVSUk9SX01FU1NBR0VTID0ge1xuICAgICAgICBJTlZBTElEX1BIT05FX0ZPUk1BVDoge1xuICAgICAgICAgICAgbWVzc2FnZTogJ9Ck0L7RgNC80LDRgiDRgtC10LvQtdGE0L7QvdGDINCy0LrQsNC30LDQvdC+INC90LXQv9GA0LDQstC40LvRjNC90L4nLFxuICAgICAgICAgICAgdHJhbnNsYXRlS2V5OiAnZXJyb3JJbnZhbGlkUGhvbmVGb3JtYXQnLFxuICAgICAgICB9LFxuICAgICAgICBQSE9ORV9BTFJFQURZX1VTRUQ6IHtcbiAgICAgICAgICAgIG1lc3NhZ2U6ICfQptC10Lkg0L3QvtC80LXRgCDRgtC10LvQtdGE0L7QvdGDINCy0LbQtSDQstC40LrQvtGA0LjRgdGC0L7QstGD0ZTRgtGM0YHRjycsXG4gICAgICAgICAgICB0cmFuc2xhdGVLZXk6ICdlcnJvclBob25lQWxyZWFkeVVzZWQnLFxuICAgICAgICB9LFxuICAgICAgICBQSE9ORV9DT05GSVJNRURfQllfQU5PVEhFUjoge1xuICAgICAgICAgICAgbWVzc2FnZTogJ9Cm0LXQuSDQvdC+0LzQtdGAINGC0LXQu9C10YTQvtC90YMg0LHRg9C70L4g0L/RltC00YLQstC10YDQtNC20LXQvdC+INGW0L3RiNC40Lwg0LrQvtGA0LjRgdGC0YPQstCw0YfQtdC8JyxcbiAgICAgICAgICAgIHRyYW5zbGF0ZUtleTogJ2Vycm9yUGhvbmVDb25maXJtZWRCeUFub3RoZXInLFxuICAgICAgICB9LFxuICAgICAgICBWRVJJRklDQVRJT05fRVhQSVJFRDoge1xuICAgICAgICAgICAgbWVzc2FnZTogJ9Cn0LDRgSDQstC10YDQuNGE0ZbQutCw0YbRltGXINC80LjQvdGD0LInLFxuICAgICAgICAgICAgdHJhbnNsYXRlS2V5OiAnZXJyb3JWZXJpZmljYXRpb25FeHBpcmVkJyxcbiAgICAgICAgfSxcbiAgICAgICAgSU5WQUxJRF9DT05GSVJNQVRJT05fQ09ERToge1xuICAgICAgICAgICAgbWVzc2FnZTogJ9Cd0LXQv9GA0LDQstC40LvRjNC90LjQuSDQutC+0LQg0L/RltC00YLQstC10YDQtNC20LXQvdC90Y8nLFxuICAgICAgICAgICAgdHJhbnNsYXRlS2V5OiAnZXJyb3JJbnZhbGlkQ29uZmlybWF0aW9uQ29kZScsXG4gICAgICAgIH0sXG4gICAgICAgIFZFUklGSUNBVElPTl9MT0NLRUQ6IHtcbiAgICAgICAgICAgIG1lc3NhZ2U6ICfQstC10YDQuNGE0ZbQutCw0YbRltGOINC30LDQsdC70L7QutC+0LLQsNC90L4uINCU0L7Rh9C10LrQsNC50YLQtdGB0Ywg0L7QvdC+0LLQu9C10L3QvdGPINGC0LDQudC80LXRgNCwJyxcbiAgICAgICAgICAgIHRyYW5zbGF0ZUtleTogJ2Vycm9yVmVyaWZpY2F0aW9uTG9ja2VkJyxcbiAgICAgICAgfSxcbiAgICAgICAgU01TX0NPREVfVElNRVI6IHtcbiAgICAgICAgICAgIG1lc3NhZ2U6XG4gICAgICAgICAgICAgICAgJ9GH0LDRgSwg0Y/QutC40Lkg0LfQsNC70LjRiNC40LLRgdGPLCDRidC+0LEg0LLQstC10YHRgtC4INC60L7QtCDQtyBTTVMt0L/QvtCy0ZbQtNC+0LzQu9C10L3QvdGPLiDQn9GW0YHQu9GPINC30LDQutGW0L3Rh9C10L3QvdGPINGH0LDRgdGDINC80L7QttC90LAg0LfQsNC/0YDQvtGB0LjRgtC4INC60L7QtCDQv9C+0LLRgtC+0YDQvdC+JyxcbiAgICAgICAgICAgIHRyYW5zbGF0ZUtleTogJ3Ntc0NvZGVUaW1lcicsXG4gICAgICAgIH0sXG4gICAgfTtcbiAgICBjb25zdCBBUEkgPSAnaHR0cHM6Ly9mYXYtcHJvbS5jb20nO1xuICAgIGNvbnN0IEVORFBPSU5UID0gJ2FwaV92ZXJpZmljYXRpb24nO1xuXG4gICAgLy8gI3JlZ2lvbiBUcmFuc2xhdGlvblxuICAgIGNvbnN0IHVrTGVuZyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyN1a0xlbmcnKTtcbiAgICBjb25zdCBlbkxlbmcgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZW5MZW5nJyk7XG4gICAgLy8gbGV0IGxvY2FsZSA9ICd1ayc7XG5cbiAgICAvL2xvY2FsZSB0ZXN0XG4gICAgbGV0IGxvY2FsZSA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oJ2xvY2FsZScpXG4gICAgICAgID8gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbSgnbG9jYWxlJylcbiAgICAgICAgOiAndWsnO1xuICAgIGlmICh1a0xlbmcpIGxvY2FsZSA9ICd1ayc7XG4gICAgaWYgKGVuTGVuZykgbG9jYWxlID0gJ2VuJztcblxuICAgIGxldCBpMThuRGF0YSA9IHt9O1xuXG4gICAgZnVuY3Rpb24gbG9hZFRyYW5zbGF0aW9ucygpIHtcbiAgICAgICAgcmV0dXJuIGZldGNoKGAke0FQSX0vJHtFTkRQT0lOVH0vdHJhbnNsYXRlcy8ke2xvY2FsZX1gKVxuICAgICAgICAgICAgLnRoZW4oKHJlcykgPT4gcmVzLmpzb24oKSlcbiAgICAgICAgICAgIC50aGVuKChqc29uKSA9PiB7XG4gICAgICAgICAgICAgICAgaTE4bkRhdGEgPSBqc29uO1xuICAgICAgICAgICAgICAgIHRyYW5zbGF0ZSgpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgbXV0YXRpb25PYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGZ1bmN0aW9uIChcbiAgICAgICAgICAgICAgICAgICAgbXV0YXRpb25zXG4gICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyYW5zbGF0ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIG11dGF0aW9uT2JzZXJ2ZXIub2JzZXJ2ZShcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ZlcmlmaWNhdGlvbicpLFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGlsZExpc3Q6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWJ0cmVlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyYW5zbGF0ZSgpIHtcbiAgICAgICAgY29uc3QgZWxlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS10cmFuc2xhdGVdJyk7XG4gICAgICAgIGlmIChlbGVtcyAmJiBlbGVtcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGVsZW1zLmZvckVhY2goKGVsZW0pID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBrZXkgPSBlbGVtLmdldEF0dHJpYnV0ZSgnZGF0YS10cmFuc2xhdGUnKTtcbiAgICAgICAgICAgICAgICBlbGVtLmlubmVySFRNTCA9IHRyYW5zbGF0ZUtleShrZXkpO1xuICAgICAgICAgICAgICAgIGVsZW0ucmVtb3ZlQXR0cmlidXRlKCdkYXRhLXRyYW5zbGF0ZScpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobG9jYWxlID09PSAnZW4nKSB7XG4gICAgICAgICAgICBtYWluUGFnZS5jbGFzc0xpc3QuYWRkKCdlbicpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVmcmVzaExvY2FsaXplZENsYXNzKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHJhbnNsYXRlS2V5KGtleSkge1xuICAgICAgICBpZiAoIWtleSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBpMThuRGF0YVtrZXldIHx8ICcqLS0tLU5FRUQgVE8gQkUgVFJBTlNMQVRFRC0tLS0qICAga2V5OiAgJyArIGtleVxuICAgICAgICApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlZnJlc2hMb2NhbGl6ZWRDbGFzcyhlbGVtZW50LCBiYXNlQ3NzQ2xhc3MpIHtcbiAgICAgICAgaWYgKCFlbGVtZW50KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBsYW5nIG9mIFsndWsnLCAnZW4nXSkge1xuICAgICAgICAgICAgZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKGJhc2VDc3NDbGFzcyArIGxhbmcpO1xuICAgICAgICB9XG4gICAgICAgIGVsZW1lbnQuY2xhc3NMaXN0LmFkZChiYXNlQ3NzQ2xhc3MgKyBsb2NhbGUpO1xuICAgIH1cblxuICAgIC8vICNlbmRyZWdpb25cblxuICAgIGFzeW5jIGZ1bmN0aW9uIGdldFVzZXIoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXMgPSBhd2FpdCB3aW5kb3cuRkUuc29ja2V0X3NlbmQoe1xuICAgICAgICAgICAgICAgIGNtZDogJ2dldF91c2VyJyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2dldFVzZXIgcmVzcG9uc2UnLCByZXMpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGZldGNoaW5nIHVzZXI6JywgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBmdW5jdGlvbiB2ZXJpZnlVc2VyUGhvbmUoY2lkKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXMgPSBhd2FpdCB3aW5kb3cuRkUuc29ja2V0X3NlbmQoe1xuICAgICAgICAgICAgICAgIGNtZDogJ2FjY291bnRpbmcvdXNlcl9waG9uZV92ZXJpZnknLFxuICAgICAgICAgICAgICAgIGNpZCxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3ZlcmlmeVVzZXJQaG9uZSByZXNwb25zZScsIHJlcyk7XG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgdmVyaWZ5aW5nIHVzZXIgcGhvbmU6JywgZXJyb3IpO1xuXG4gICAgICAgICAgICByZXR1cm4gZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBmdW5jdGlvbiBjaGFuZ2VVc2VyUGhvbmUodXNlckRhdGEpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goJy9hY2NvdW50aW5nL2FwaS9jaGFuZ2VfdXNlcicsIHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBib2R5OiB1c2VyRGF0YSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjaGFuZ2VVc2VyUGhvbmUgcmVzcG9uc2U6JywgZGF0YSk7XG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGNoYW5naW5nIHVzZXIgcGhvbmU6JywgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBmdW5jdGlvbiBjb25maXJtVXNlclBob25lKGNvbmZpcm1Db2RlLCBzZXNzaW9uSWQpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IHdpbmRvdy5GRS5zb2NrZXRfc2VuZCh7XG4gICAgICAgICAgICAgICAgY21kOiAnYWNjb3VudGluZy91c2VyX3Bob25lX2NvbmZpcm0nLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlybV9jb2RlOiBgJHtjb25maXJtQ29kZX1gLFxuICAgICAgICAgICAgICAgICAgICBzZXNzaW9uX2lkOiBgJHtzZXNzaW9uSWR9YCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjb25maXJtVXNlclBob25lIHJlc3BvbnNlJywgcmVzKTtcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjb25maXJtaW5nIHVzZXIgcGhvbmU6JywgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBmdW5jdGlvbiBhZGRWZXJpZmljYXRpb24oZGF0YSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgZmV0Y2goYCR7QVBJfS8ke0VORFBPSU5UfWAsIHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShkYXRhKSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgYWRkaW5nIHZlcmlmaWNhdGlvbjonLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dJbnB1dE1lc3NhZ2UobWVzc2FnZSwgdGFyZ2V0RWxlbWVudCwgc3RhdGUgPSBmYWxzZSkge1xuICAgICAgICBjb25zdCBpbnB1dEVsZW1lbnQgPSB0YXJnZXRFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ2lucHV0Jyk7XG4gICAgICAgIGNvbnN0IGJ1dHRvbkVsZW1lbnQgPSB0YXJnZXRFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ2J1dHRvbicpO1xuXG4gICAgICAgIC8vIFJlbW92ZSBhbGwgbWVzc2FnZXMgaWYgY2FsbGVkIGZyb20gdGltZXIgZXhwaXJhdGlvblxuICAgICAgICBpZiAoXG4gICAgICAgICAgICB0YXJnZXRFbGVtZW50LmlkID09PSAnY29uZmlybWF0aW9uX19mb3JtJyAmJlxuICAgICAgICAgICAgdGFyZ2V0RWxlbWVudC5kYXRhc2V0LmNvbmZpcm1hdGlvbkV4cGlyZWQgPT09ICd0cnVlJ1xuICAgICAgICApIHtcbiAgICAgICAgICAgIGNvbnN0IGFsbE1lc3NhZ2VzID0gdGFyZ2V0RWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuaW5wdXQtbXNnJyk7XG4gICAgICAgICAgICBhbGxNZXNzYWdlcy5mb3JFYWNoKChtc2cpID0+IG1zZy5yZW1vdmUoKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGaW5kIGVycm9yIG1lc3NhZ2Ugb2JqZWN0IGlmIGl0IGV4aXN0c1xuICAgICAgICBsZXQgZXJyb3JPYmogPSBudWxsO1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBFUlJPUl9NRVNTQUdFUykge1xuICAgICAgICAgICAgaWYgKEVSUk9SX01FU1NBR0VTW2tleV0ubWVzc2FnZSA9PT0gbWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIGVycm9yT2JqID0gRVJST1JfTUVTU0FHRVNba2V5XTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGZvciBleGlzdGluZyBtZXNzYWdlcyB3aXRoIHRoZSBzYW1lIGNvbnRlbnRcbiAgICAgICAgY29uc3QgZXhpc3RpbmdNZXNzYWdlcyA9IHRhcmdldEVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmlucHV0LW1zZycpO1xuICAgICAgICBmb3IgKGNvbnN0IG1zZyBvZiBleGlzdGluZ01lc3NhZ2VzKSB7XG4gICAgICAgICAgICBpZiAobXNnLmhhc0F0dHJpYnV0ZSgnZGF0YS1jb2RlLWVycm9yJykpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShtZXNzYWdlKSAmJiBtZXNzYWdlLmxlbmd0aCA9PT0gMikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVyV3JhcHBlciA9IG1zZy5xdWVyeVNlbGVjdG9yKCcudGltZXJXcmFwcGVyJyk7XG4gICAgICAgICAgICAgICAgaWYgKHRpbWVyV3JhcHBlcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0aW1lciA9IHRpbWVyV3JhcHBlci5xdWVyeVNlbGVjdG9yKCcudGltZXInKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRpbWVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lci50ZXh0Q29udGVudCA9IG1lc3NhZ2VbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1zZy50ZXh0Q29udGVudCA9PT0gbWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbXNnLnJlbW92ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ3JlYXRlIG5ldyBtZXNzYWdlIGVsZW1lbnRcbiAgICAgICAgY29uc3QgbWVzc2FnZUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgbWVzc2FnZUVsZW1lbnQuY2xhc3NMaXN0LmFkZCgnaW5wdXQtbXNnJyk7XG5cbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobWVzc2FnZSkgJiYgbWVzc2FnZS5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVyV3JhcHBlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgdGltZXJXcmFwcGVyLmNsYXNzTGlzdC5hZGQoJ3RpbWVyV3JhcHBlcicpO1xuICAgICAgICAgICAgdGltZXJXcmFwcGVyLnN0eWxlLm1pbldpZHRoID0gc3RhdGUgPyAnNjVweCcgOiAnNDVweCc7XG5cbiAgICAgICAgICAgIGNvbnN0IGZpcnN0U3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIGZpcnN0U3Bhbi50ZXh0Q29udGVudCA9IG1lc3NhZ2VbMF07XG4gICAgICAgICAgICBmaXJzdFNwYW4uY2xhc3NMaXN0LmFkZCgndGltZXInKTtcblxuICAgICAgICAgICAgdGltZXJXcmFwcGVyLmFwcGVuZENoaWxkKGZpcnN0U3Bhbik7XG5cbiAgICAgICAgICAgIGNvbnN0IHNlY29uZFNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICBzZWNvbmRTcGFuLnRleHRDb250ZW50ID0gbWVzc2FnZVsxXTtcbiAgICAgICAgICAgIHNlY29uZFNwYW4uY2xhc3NMaXN0LmFkZChzdGF0ZSA/ICdlcnJvcicgOiAnd2FybmluZycpO1xuXG4gICAgICAgICAgICAvLyBBZGQgdHJhbnNsYXRpb24ga2V5IGlmIG1lc3NhZ2UgbWF0Y2hlcyB0aGUgdmVyaWZpY2F0aW9uIGxvY2tlZCBvciBTTVMgdGltZXIgbWVzc2FnZVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2VbMV0gPT09IEVSUk9SX01FU1NBR0VTLlZFUklGSUNBVElPTl9MT0NLRUQubWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIHNlY29uZFNwYW4uc2V0QXR0cmlidXRlKFxuICAgICAgICAgICAgICAgICAgICAnZGF0YS10cmFuc2xhdGUnLFxuICAgICAgICAgICAgICAgICAgICBFUlJPUl9NRVNTQUdFUy5WRVJJRklDQVRJT05fTE9DS0VELnRyYW5zbGF0ZUtleVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2VbMV0gPT09IEVSUk9SX01FU1NBR0VTLlNNU19DT0RFX1RJTUVSLm1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICBzZWNvbmRTcGFuLnNldEF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgICAgICAgJ2RhdGEtdHJhbnNsYXRlJyxcbiAgICAgICAgICAgICAgICAgICAgRVJST1JfTUVTU0FHRVMuU01TX0NPREVfVElNRVIudHJhbnNsYXRlS2V5XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbWVzc2FnZUVsZW1lbnQuYXBwZW5kQ2hpbGQodGltZXJXcmFwcGVyKTtcbiAgICAgICAgICAgIG1lc3NhZ2VFbGVtZW50LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcgJykpO1xuICAgICAgICAgICAgbWVzc2FnZUVsZW1lbnQuYXBwZW5kQ2hpbGQoc2Vjb25kU3Bhbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtZXNzYWdlRWxlbWVudC50ZXh0Q29udGVudCA9IG1lc3NhZ2U7XG5cbiAgICAgICAgICAgIC8vIEFkZCB0cmFuc2xhdGlvbiBrZXkgaWYgZXJyb3IgbWVzc2FnZSBleGlzdHMgaW4gb3VyIHN0cnVjdHVyZVxuICAgICAgICAgICAgaWYgKGVycm9yT2JqKSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZUVsZW1lbnQuc2V0QXR0cmlidXRlKFxuICAgICAgICAgICAgICAgICAgICAnZGF0YS10cmFuc2xhdGUnLFxuICAgICAgICAgICAgICAgICAgICBlcnJvck9iai50cmFuc2xhdGVLZXlcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgbWVzc2FnZUVsZW1lbnQuY2xhc3NMaXN0LmFkZChzdGF0ZSA/ICdlcnJvcicgOiAnd2FybmluZycpO1xuXG4gICAgICAgIC8vIEhhbmRsZSBtZXNzYWdlIHBvc2l0aW9uaW5nXG4gICAgICAgIGlmIChtZXNzYWdlID09PSAn0J3QtdC/0YDQsNCy0LjQu9GM0L3QuNC5INC60L7QtCDQv9GW0LTRgtCy0LXRgNC00LbQtdC90L3RjycpIHtcbiAgICAgICAgICAgIG1lc3NhZ2VFbGVtZW50LnNldEF0dHJpYnV0ZSgnZGF0YS1jb2RlLWVycm9yJywgJ3RydWUnKTtcbiAgICAgICAgICAgIC8vIEFsd2F5cyBpbnNlcnQgZXJyb3IgbWVzc2FnZXMgYXQgdGhlIHRvcFxuICAgICAgICAgICAgaW5wdXRFbGVtZW50LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKFxuICAgICAgICAgICAgICAgIG1lc3NhZ2VFbGVtZW50LFxuICAgICAgICAgICAgICAgIGlucHV0RWxlbWVudC5uZXh0U2libGluZ1xuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgLy8gTW92ZSBhbnkgZXhpc3Rpbmcgbm9uLWVycm9yIG1lc3NhZ2VzIGJlbG93IHRoaXMgb25lXG4gICAgICAgICAgICBjb25zdCBvdGhlck1lc3NhZ2VzID0gdGFyZ2V0RWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKFxuICAgICAgICAgICAgICAgICcuaW5wdXQtbXNnOm5vdChbZGF0YS1jb2RlLWVycm9yXSknXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgb3RoZXJNZXNzYWdlcy5mb3JFYWNoKChtc2cpID0+IHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlRWxlbWVudC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShcbiAgICAgICAgICAgICAgICAgICAgbXNnLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlRWxlbWVudC5uZXh0U2libGluZ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZvciBub24tZXJyb3IgbWVzc2FnZXMsIGluc2VydCBhZnRlciBhbnkgZXhpc3RpbmcgZXJyb3IgbWVzc2FnZSwgb3IgYmVmb3JlIHRoZSBidXR0b25cbiAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nRXJyb3JNc2cgPVxuICAgICAgICAgICAgICAgIHRhcmdldEVsZW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtY29kZS1lcnJvcl0nKTtcbiAgICAgICAgICAgIGNvbnN0IGluc2VydEJlZm9yZSA9IGV4aXN0aW5nRXJyb3JNc2dcbiAgICAgICAgICAgICAgICA/IGV4aXN0aW5nRXJyb3JNc2cubmV4dFNpYmxpbmdcbiAgICAgICAgICAgICAgICA6IGJ1dHRvbkVsZW1lbnQ7XG4gICAgICAgICAgICBpbnB1dEVsZW1lbnQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobWVzc2FnZUVsZW1lbnQsIGluc2VydEJlZm9yZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1Bob25lVmFsaWQocGhvbmUpIHtcbiAgICAgICAgY29uc3QgcGhvbmVSZWdleCA9IC9eXFwrMzgwXFxkezl9JC87XG4gICAgICAgIHJldHVybiBwaG9uZVJlZ2V4LnRlc3QocGhvbmUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlbW92ZUV4aXN0aW5nTWVzc2FnZXModGFyZ2V0RWxlbWVudCkge1xuICAgICAgICBjb25zdCBleGlzdGluZ01lc3NhZ2VzID0gdGFyZ2V0RWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuaW5wdXQtbXNnJyk7XG4gICAgICAgIGV4aXN0aW5nTWVzc2FnZXMuZm9yRWFjaCgobXNnKSA9PiBtc2cucmVtb3ZlKCkpO1xuICAgIH1cblxuICAgIGNvbnN0IHBob25lSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGhvbmUnKTtcbiAgICBjb25zdCBjb25maXJtYXRpb25Db2RlSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29uZmlybWF0aW9uLWNvZGUnKTtcbiAgICBjb25zdCB2ZXJpZmljYXRpb25Gb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ZlcmlmaWNhdGlvbl9fZm9ybScpO1xuICAgIGNvbnN0IGxpbmtCdXR0b25XcmFwcGVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmxpbmtfX2J1dHRvbi13cmFwcGVyJyk7XG4gICAgY29uc3Qgc3VibWl0QnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N1Ym1pdC1idXR0b24nKTtcblxuICAgIC8vVGVzdCBidXR0b25zXG4gICAgY29uc3QgYXV0aG9yaXplZEJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5idXR0b24tYXV0aG9yaXplZCcpO1xuICAgIGNvbnN0IG5vdEF1dGhvcml6ZWRCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYnV0dG9uLW5vdEF1dGhvcml6ZWQnKTtcbiAgICBjb25zdCBzdWNjZXNzQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmJ1dHRvbi1zdWNjZXNzJyk7XG4gICAgY29uc3Qgc3VjY2Vzc0JlZm9yZUJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5idXR0b24tc3VjY2Vzc0JlZm9yZScpO1xuICAgIGNvbnN0IGRhcmtUaGVtZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5idXR0b24tZGFyaycpO1xuXG4gICAgLy9TdGF0ZXNcbiAgICBsZXQgYXV0aG9yaXplZCA9IGZhbHNlO1xuICAgIGxldCBub3RBdXRob3JpemVkID0gdHJ1ZTtcbiAgICBsZXQgc3VjY2VzcyA9IGZhbHNlO1xuICAgIGxldCBzdWNjZXNzQmVmb3JlID0gZmFsc2U7XG5cbiAgICBhc3luYyBmdW5jdGlvbiBpbml0KCkge1xuICAgICAgICBjb25zb2xlLmxvZygnJWMgaW5pdCBmaXJlZCcsICdjb2xvcjogIzAwZmYwMDsgZm9udC13ZWlnaHQ6IGJvbGQnKTtcbiAgICAgICAgY29uc29sZS5sb2coJyVjIGluaXQgZmlyZWQnLCAnY29sb3I6ICMwMGZmMDA7IGZvbnQtd2VpZ2h0OiBib2xkJyk7XG4gICAgICAgIC8vIGxldCB1c2VyUGhvbmVOdW1iZXIgPSBudWxsO1xuICAgICAgICAvLyBsZXQgdXNlclBob25lVmVyaWZpZWQgPSBmYWxzZTtcblxuICAgICAgICBjb25zdCB1cGRhdGVVSUJhc2VkT25TdGF0ZSA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdVcGRhdGluZyBVSSwgc3RhdGVzOicsIHtcbiAgICAgICAgICAgICAgICBhdXRob3JpemVkLFxuICAgICAgICAgICAgICAgIG5vdEF1dGhvcml6ZWQsXG4gICAgICAgICAgICAgICAgc3VjY2Vzc0JlZm9yZSxcbiAgICAgICAgICAgICAgICBzdWNjZXNzLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zdCBmb3JtV3JhcHBlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5mb3JtX193cmFwcGVyJyk7XG4gICAgICAgICAgICBjb25zdCBmb3JtQ29udGFpbmVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmZvcm1fX2NvbnRhaW5lcicpO1xuICAgICAgICAgICAgY29uc3QgZm9ybUNvbnRhaW5lclN1Y2Nlc3NCZWZvcmUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFxuICAgICAgICAgICAgICAgICcuZm9ybV9fY29udGFpbmVyLXN1Y2Nlc3NCZWZvcmUnXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAvLyBSZXNldCBhbGwgc3RhdGVzIGZpcnN0XG4gICAgICAgICAgICAvLyBmb3JtV3JhcHBlcj8uY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJywgJ3Zpc2libGUnKTtcbiAgICAgICAgICAgIC8vIGZvcm1Db250YWluZXI/LmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicsICd2aXNpYmxlJyk7XG4gICAgICAgICAgICAvLyB2ZXJpZmljYXRpb25Gb3JtPy5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nLCAndmlzaWJsZScpO1xuXG4gICAgICAgICAgICBpZiAobm90QXV0aG9yaXplZCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdub3QgYXV0aG9yaXplZCcpO1xuICAgICAgICAgICAgICAgIGZvcm1XcmFwcGVyPy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICBsaW5rQnV0dG9uV3JhcHBlcj8uY2xhc3NMaXN0LmFkZCgndmlzaWJsZScpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChhdXRob3JpemVkKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2F1dGhvcml6ZWQnKTtcbiAgICAgICAgICAgICAgICBsaW5rQnV0dG9uV3JhcHBlcj8uY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgbGlua0J1dHRvbldyYXBwZXI/LmNsYXNzTGlzdC5yZW1vdmUoJ3Zpc2libGUnKTtcblxuICAgICAgICAgICAgICAgIGZvcm1XcmFwcGVyPy5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25Gb3JtPy5jbGFzc0xpc3QuYWRkKCd2aXNpYmxlJyk7XG4gICAgICAgICAgICAgICAgdmVyaWZpY2F0aW9uRm9ybT8uY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHN1Y2Nlc3NCZWZvcmUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc3VjY2Vzc0JlZm9yZScpO1xuICAgICAgICAgICAgICAgIGZvcm1Db250YWluZXI/LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIGZvcm1Db250YWluZXJTdWNjZXNzQmVmb3JlPy5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBhdXRob3JpemVkQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdhdXRob3JpemVkQnV0dG9uIGNsaWNrZWQnKTtcblxuICAgICAgICAgICAgYXV0aG9yaXplZCA9IHRydWU7XG4gICAgICAgICAgICBub3RBdXRob3JpemVkID0gZmFsc2U7XG4gICAgICAgICAgICBzdWNjZXNzID0gZmFsc2U7XG4gICAgICAgICAgICBzdWNjZXNzQmVmb3JlID0gZmFsc2U7XG4gICAgICAgICAgICB1cGRhdGVVSUJhc2VkT25TdGF0ZSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICBub3RBdXRob3JpemVkQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdub3RBdXRob3JpemVkQnV0dG9uIGNsaWNrZWQnKTtcbiAgICAgICAgICAgIGF1dGhvcml6ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIG5vdEF1dGhvcml6ZWQgPSB0cnVlO1xuICAgICAgICAgICAgc3VjY2VzcyA9IGZhbHNlO1xuICAgICAgICAgICAgc3VjY2Vzc0JlZm9yZSA9IGZhbHNlO1xuICAgICAgICAgICAgdXBkYXRlVUlCYXNlZE9uU3RhdGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gc3VjY2Vzc0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgIC8vICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIC8vICAgICB1cGRhdGVVSUJhc2VkT25TdGF0ZSgpO1xuICAgICAgICAvLyB9KTtcblxuICAgICAgICBzdWNjZXNzQmVmb3JlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzdWNjZXNzQmVmb3JlQnV0dG9uIGNsaWNrZWQnKTtcbiAgICAgICAgICAgIGF1dGhvcml6ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIG5vdEF1dGhvcml6ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHN1Y2Nlc3MgPSBmYWxzZTtcbiAgICAgICAgICAgIHN1Y2Nlc3NCZWZvcmUgPSB0cnVlO1xuICAgICAgICAgICAgdXBkYXRlVUlCYXNlZE9uU3RhdGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZGFya1RoZW1lLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGlmIChsb2NhbGUgPT09ICd1aycpIHtcbiAgICAgICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKCdsb2NhbGUnLCAnZW4nKTtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGxvY2FsZSA9PT0gJ2VuJykge1xuICAgICAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oJ2xvY2FsZScsICd1aycpO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWwgVUkgdXBkYXRlXG4gICAgICAgIHVwZGF0ZVVJQmFzZWRPblN0YXRlKCk7XG5cbiAgICAgICAgLy8gaWYgKHdpbmRvdy5GRT8udXNlci5yb2xlID09PSAnZ3Vlc3QnKSB7XG4gICAgICAgIC8vICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuZm9ybV9fd3JhcHBlcicpLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgICAgICAvLyAgICAgbGlua0J1dHRvbldyYXBwZXIuY2xhc3NMaXN0LmFkZCgndmlzaWJsZScpO1xuICAgICAgICAvLyAgICAgbGlua0J1dHRvbldyYXBwZXIuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG5cbiAgICAgICAgLy8gICAgIHJldHVybjtcbiAgICAgICAgLy8gfSBlbHNlIHtcbiAgICAgICAgLy8gICAgIHZlcmlmaWNhdGlvbkZvcm0uY2xhc3NMaXN0LmFkZCgndmlzaWJsZScpO1xuICAgICAgICAvLyAgICAgdmVyaWZpY2F0aW9uRm9ybS5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICAgICAgLy8gfVxuXG4gICAgICAgIGNvbnN0IGNvbmZpcm1hdGlvbkZvcm0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29uZmlybWF0aW9uX19mb3JtJyk7XG4gICAgICAgIGNvbnN0IGNvbmZpcm1CdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29uZmlybS1idXR0b24nKTtcblxuICAgICAgICBsZXQgdmVyaWZpY2F0aW9uU2Vzc2lvbiA9IG51bGw7XG4gICAgICAgIGxldCB2ZXJpZmljYXRpb25UaW1lciA9IG51bGw7XG4gICAgICAgIGxldCB1c2VyID0gbnVsbDtcbiAgICAgICAgbGV0IGNpZCA9IG51bGw7XG5cbiAgICAgICAgbGV0IHN1Ym1pdHRlZFBob25lID0gbnVsbDtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gdXNlciA9IGF3YWl0IGdldFVzZXIoKTtcbiAgICAgICAgICAgIC8vIGNpZCA9IHVzZXIuY2lkO1xuICAgICAgICAgICAgLy8gdXNlclBob25lTnVtYmVyID0gdXNlci5kYXRhLmFjY291bnQucGhvbmVfbnVtYmVyO1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ3VzZXJQaG9uZU51bWJlcjonLCB1c2VyUGhvbmVOdW1iZXIpO1xuICAgICAgICAgICAgLy8gdXNlclBob25lVmVyaWZpZWQgPSB1c2VyLmRhdGEuYWNjb3VudC5hY2NvdW50X3N0YXR1cy5maW5kKFxuICAgICAgICAgICAgLy8gICAgIChzdGF0dXMpID0+IHN0YXR1cy5hbGlhcyA9PT0gJ0lTX1BIT05FX1ZFUklGSUVEJ1xuICAgICAgICAgICAgLy8gKS52YWx1ZTtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCd1c2VyUGhvbmVWZXJpZmllZDonLCB1c2VyUGhvbmVWZXJpZmllZCk7XG4gICAgICAgICAgICAvLyB1c2VyUGhvbmVOdW1iZXIgPSB0cnVlO1xuICAgICAgICAgICAgLy8gdXNlclBob25lVmVyaWZpZWQgPSB0cnVlO1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdXNlciBoYXMgYSBudW1iZXIgYW5kIGlzIGFscmVhZHkgdmVyaWZpZWRcbiAgICAgICAgICAgIC8vIGlmICh1c2VyUGhvbmVOdW1iZXIgJiYgdXNlclBob25lVmVyaWZpZWQpIHtcbiAgICAgICAgICAgIC8vICAgICBkb2N1bWVudFxuICAgICAgICAgICAgLy8gICAgICAgICAucXVlcnlTZWxlY3RvcignLmZvcm1fX2NvbnRhaW5lcicpXG4gICAgICAgICAgICAvLyAgICAgICAgIC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIC8vICAgICBkb2N1bWVudFxuICAgICAgICAgICAgLy8gICAgICAgICAucXVlcnlTZWxlY3RvcignLmZvcm1fX2NvbnRhaW5lci1zdWNjZXNzQmVmb3JlJylcbiAgICAgICAgICAgIC8vICAgICAgICAgLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuICAgICAgICAgICAgLy8gICAgIHJldHVybjtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgIC8vIHZlcmlmaWNhdGlvbkZvcm0uY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG4gICAgICAgICAgICAvLyB2ZXJpZmljYXRpb25Gb3JtLmNsYXNzTGlzdC5hZGQoJ3Zpc2libGUnKTtcbiAgICAgICAgICAgIC8vIHBob25lSW5wdXQudmFsdWUgPSBgKyR7dXNlclBob25lTnVtYmVyfWA7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gZ2V0IHVzZXI6JywgZXJyb3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3RhcnRWZXJpZmljYXRpb25UaW1lciA9IChcbiAgICAgICAgICAgIHRvdGFsU2Vjb25kcyxcbiAgICAgICAgICAgIHsgY29uZmlybWF0aW9uID0gZmFsc2UsIHZlcmlmaWNhdGlvbiA9IGZhbHNlIH1cbiAgICAgICAgKSA9PiB7XG4gICAgICAgICAgICBjb25maXJtQnV0dG9uLnRleHRDb250ZW50ID0gJ9Cd0JDQlNCG0KHQm9CQ0KLQmCc7XG4gICAgICAgICAgICBjb25maXJtQnV0dG9uLnNldEF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgICAnZGF0YS10cmFuc2xhdGUnLFxuICAgICAgICAgICAgICAgICdzZW5kQ29uZmlybWF0aW9uQ29kZSdcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGlmICh2ZXJpZmljYXRpb25UaW1lcikge1xuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodmVyaWZpY2F0aW9uVGltZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgdGltZUxlZnQgPSB0b3RhbFNlY29uZHM7XG5cbiAgICAgICAgICAgIHZlcmlmaWNhdGlvblRpbWVyID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0aW1lTGVmdCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodmVyaWZpY2F0aW9uVGltZXIpO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpcm1CdXR0b24uZGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlybUJ1dHRvbi50ZXh0Q29udGVudCA9ICfQndCQ0JTQhtCh0JvQkNCi0Jgg0J/QntCS0KLQntCg0J3Qnic7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpcm1CdXR0b24uc2V0QXR0cmlidXRlKFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2RhdGEtdHJhbnNsYXRlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdyZXNlbmRDb25maXJtYXRpb25Db2RlJ1xuICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgICAgIHJlbW92ZUV4aXN0aW5nTWVzc2FnZXModmVyaWZpY2F0aW9uRm9ybSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUmVzZXQgdGhlIGZvcm0gYW5kIHJlbW92ZSByZXF1aXJlZCBhdHRyaWJ1dGVcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29kZUlucHV0ID1cbiAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb25maXJtYXRpb24tY29kZScpO1xuICAgICAgICAgICAgICAgICAgICBjb2RlSW5wdXQudmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgY29kZUlucHV0LnJlcXVpcmVkID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hhbmdlIGZvcm0gc3VibWl0IGJlaGF2aW9yIHRvIHZlcmlmaWNhdGlvbiBhbmQgdHJpZ2dlciBjbGVhbnVwXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpcm1hdGlvbkZvcm0uZGF0YXNldC5jb25maXJtYXRpb25FeHBpcmVkID0gJ3RydWUnO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgbWVzc2FnZSBhYm91dCBleHBpcmVkIGNvZGUgKGNsZWFudXAgd2lsbCBoYXBwZW4gaW4gc2hvd0lucHV0TWVzc2FnZSlcbiAgICAgICAgICAgICAgICAgICAgc2hvd0lucHV0TWVzc2FnZShcbiAgICAgICAgICAgICAgICAgICAgICAgIEVSUk9SX01FU1NBR0VTLlZFUklGSUNBVElPTl9FWFBJUkVELm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maXJtYXRpb25Gb3JtLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2Vycm9yJ1xuICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBtaW51dGVzID0gTWF0aC5mbG9vcih0aW1lTGVmdCAvIDYwKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWNvbmRzID0gdGltZUxlZnQgJSA2MDtcblxuICAgICAgICAgICAgICAgIGlmICh2ZXJpZmljYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgc2hvd0lucHV0TWVzc2FnZShcbiAgICAgICAgICAgICAgICAgICAgICAgIFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBgJHtNYXRoLmZsb29yKHRpbWVMZWZ0IC8gMzYwMClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRvU3RyaW5nKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnBhZFN0YXJ0KDIsICcwJyl9OiR7TWF0aC5mbG9vcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHRpbWVMZWZ0ICUgMzYwMCkgLyA2MFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRvU3RyaW5nKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnBhZFN0YXJ0KDIsICcwJyl9OiR7KHRpbWVMZWZ0ICUgNjApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50b1N0cmluZygpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5wYWRTdGFydCgyLCAnMCcpfWAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRVJST1JfTUVTU0FHRVMuVkVSSUZJQ0FUSU9OX0xPQ0tFRC5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvbkZvcm0sXG4gICAgICAgICAgICAgICAgICAgICAgICAnZXJyb3InXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGNvbmZpcm1hdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBzaG93SW5wdXRNZXNzYWdlKFxuICAgICAgICAgICAgICAgICAgICAgICAgW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGAke21pbnV0ZXMudG9TdHJpbmcoKS5wYWRTdGFydCgyLCAnMCcpfToke3NlY29uZHMudG9TdHJpbmcoKS5wYWRTdGFydCgyLCAnMCcpfWAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRVJST1JfTUVTU0FHRVMuU01TX0NPREVfVElNRVIubWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maXJtYXRpb25Gb3JtLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGltZUxlZnQtLTtcbiAgICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGhhbmRsZVZlcmlmaWNhdGlvblJlc3BvbnNlID0gKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgICAncmVzcG9uc2UgZnJvbSB2ZXJpZnlVc2VyUGhvbmUgaW5zaWRlIGhhbmRsZVZlcmlmaWNhdGlvblJlc3BvbnNlJyxcbiAgICAgICAgICAgICAgICByZXNwb25zZVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGNvbnN0IHN0ZXAgPSB7XG4gICAgICAgICAgICAgICAgY29uZmlybWF0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb246IGZhbHNlLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvblNlc3Npb24gPSByZXNwb25zZS5kYXRhLnNlc3Npb25faWQ7XG4gICAgICAgICAgICAgICAgLy8gT25seSBoYW5kbGUgZm9ybSB2aXNpYmlsaXR5IGlmIGl0J3MgaGlkZGVuXG4gICAgICAgICAgICAgICAgaWYgKGNvbmZpcm1hdGlvbkZvcm0uY2xhc3NMaXN0LmNvbnRhaW5zKCdoaWRkZW4nKSkge1xuICAgICAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25Gb3JtLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25Gb3JtLmNsYXNzTGlzdC5yZW1vdmUoJ3Zpc2libGUnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlybWF0aW9uRm9ybS5jbGFzc0xpc3QuYWRkKCd2aXNpYmxlJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpcm1hdGlvbkZvcm0uY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc3RlcC5jb25maXJtYXRpb24gPSB0cnVlO1xuICAgICAgICAgICAgICAgIC8vIFN0YXJ0IHRpbWVyIGZvciBjb2RlIHZlcmlmaWNhdGlvblxuICAgICAgICAgICAgICAgIGNvbnN0IHR0bCA9IHJlc3BvbnNlLmRhdGEucGhvbmVfdmVyaWZpY2F0aW9uX3R0bDtcbiAgICAgICAgICAgICAgICBzdGFydFZlcmlmaWNhdGlvblRpbWVyKHR0bCwgc3RlcCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgICAgICAgIHJlc3BvbnNlLmNvZGUgPT09IC0yNCAmJlxuICAgICAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2UucmVhc29uID09PSAndmVyaWZpY2F0aW9uX2xvY2tlZCdcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgcmVzdF90aW1lIH0gPSByZXNwb25zZS5tZXNzYWdlO1xuICAgICAgICAgICAgICAgIHN1Ym1pdEJ1dHRvbi5kaXNhYmxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgcGhvbmVJbnB1dC5kaXNhYmxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgc3RlcC52ZXJpZmljYXRpb24gPSB0cnVlO1xuICAgICAgICAgICAgICAgIHN0YXJ0VmVyaWZpY2F0aW9uVGltZXIocmVzdF90aW1lLCBzdGVwKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgICAgICAgcmVzcG9uc2UuY29kZSA9PT0gLTI0ICYmXG4gICAgICAgICAgICAgICAgcmVzcG9uc2UubWVzc2FnZS5yZWFzb24gPT09XG4gICAgICAgICAgICAgICAgICAgICdwaG9uZV9udW1iZXJfaGFzX2JlZW5fY29uZmlybWVkX2J5X2Fub3RoZXJfdXNlcidcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIHN1Ym1pdEJ1dHRvbi5kaXNhYmxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHNob3dJbnB1dE1lc3NhZ2UoXG4gICAgICAgICAgICAgICAgICAgIEVSUk9SX01FU1NBR0VTLlBIT05FX0NPTkZJUk1FRF9CWV9BTk9USEVSLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvbkZvcm0sXG4gICAgICAgICAgICAgICAgICAgICdlcnJvcidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vVXNlciBzdGFydHMgdG8gY2hhbmdlIHBob25lIG51bWJlclxuICAgICAgICBwaG9uZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZS50YXJnZXQudmFsdWU7XG4gICAgICAgICAgICAvLyBSZW1vdmUgaXMtaW52YWxpZCBjbGFzcyBpbml0aWFsbHlcbiAgICAgICAgICAgIHBob25lSW5wdXQuY2xhc3NMaXN0LnJlbW92ZSgnaXMtaW52YWxpZCcpO1xuICAgICAgICAgICAgLy8gVmFsaWRhdGUgcGhvbmUgbnVtYmVyXG4gICAgICAgICAgICBpZiAoIWlzUGhvbmVWYWxpZCh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBwaG9uZUlucHV0LmNsYXNzTGlzdC5hZGQoJ2lzLWludmFsaWQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVtb3ZlRXhpc3RpbmdNZXNzYWdlcyh2ZXJpZmljYXRpb25Gb3JtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChlLnRhcmdldC52YWx1ZS5zbGljZSgxKSA9PT0gdXNlclBob25lTnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgc3VibWl0QnV0dG9uLmlubmVySFRNTCA9ICfQn9CG0JTQotCS0JXQoNCU0JjQotCYJztcbiAgICAgICAgICAgICAgICBzdWJtaXRCdXR0b24uc2V0QXR0cmlidXRlKCdkYXRhLXRyYW5zbGF0ZScsICdjb25maXJtJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN1Ym1pdEJ1dHRvbi5pbm5lckhUTUwgPSAn0JfQkdCV0KDQldCT0KLQmCc7XG4gICAgICAgICAgICAgICAgc3VibWl0QnV0dG9uLnNldEF0dHJpYnV0ZSgnZGF0YS10cmFuc2xhdGUnLCAnc2F2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBjb25maXJtYXRpb25Db2RlSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gUmVtb3ZlIG5vbi1udW1lcmljIGNoYXJhY3RlcnNcbiAgICAgICAgICAgIGUudGFyZ2V0LnZhbHVlID0gZS50YXJnZXQudmFsdWUucmVwbGFjZSgvW14wLTldL2csICcnKTtcblxuICAgICAgICAgICAgLy8gQWRkL3JlbW92ZSAuaXMtaW52YWxpZCBjbGFzcyBiYXNlZCBvbiB2YWxpZGF0aW9uXG4gICAgICAgICAgICBpZiAoZS50YXJnZXQudmFsdWUubGVuZ3RoICE9PSA1KSB7XG4gICAgICAgICAgICAgICAgZS50YXJnZXQuY2xhc3NMaXN0LmFkZCgnaXMtaW52YWxpZCcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlLnRhcmdldC5jbGFzc0xpc3QucmVtb3ZlKCdpcy1pbnZhbGlkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFVzZXIgc3VibWl0cyB2ZXJpZmljYXRpb24gZm9ybVxuICAgICAgICB2ZXJpZmljYXRpb25Gb3JtLmFkZEV2ZW50TGlzdGVuZXIoJ3N1Ym1pdCcsIGFzeW5jIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgICAnJWMgRm9ybSBzdWJtaXR0ZWQnLFxuICAgICAgICAgICAgICAgICdjb2xvcjogI2ZmMDBmZjsgZm9udC13ZWlnaHQ6IGJvbGQnLFxuICAgICAgICAgICAgICAgIGVcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBzdWJtaXRCdXR0b24uZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgc3VibWl0dGVkUGhvbmUgPSBlLnRhcmdldFswXS52YWx1ZTtcblxuICAgICAgICAgICAgaWYgKCFpc1Bob25lVmFsaWQoc3VibWl0dGVkUGhvbmUpKSB7XG4gICAgICAgICAgICAgICAgc2hvd0lucHV0TWVzc2FnZShcbiAgICAgICAgICAgICAgICAgICAgRVJST1JfTUVTU0FHRVMuSU5WQUxJRF9QSE9ORV9GT1JNQVQubWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgdmVyaWZpY2F0aW9uRm9ybSxcbiAgICAgICAgICAgICAgICAgICAgJ2Vycm9yJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgc3VibWl0QnV0dG9uLmRpc2FibGVkID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlbW92ZUV4aXN0aW5nTWVzc2FnZXModmVyaWZpY2F0aW9uRm9ybSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdXNlcklkID0gdXNlci5kYXRhLmFjY291bnQuaWQ7XG4gICAgICAgICAgICAgICAgY29uc3QgdXNlckRhdGEgPSBuZXcgRm9ybURhdGEoKTtcblxuICAgICAgICAgICAgICAgIHVzZXJEYXRhLmFwcGVuZCgncGhvbmUnLCBzdWJtaXR0ZWRQaG9uZSk7XG4gICAgICAgICAgICAgICAgdXNlckRhdGEuYXBwZW5kKCd1c2VyaWQnLCB1c2VySWQpO1xuXG4gICAgICAgICAgICAgICAgLy9DaGFuZ2UgdXNlciBwaG9uZSBudW1iZXJcbiAgICAgICAgICAgICAgICBpZiAoc3VibWl0dGVkUGhvbmUgIT09IGArJHt1c2VyUGhvbmVOdW1iZXJ9YCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVFJZIENIQU5HRSBVU0VSIFBIT05FLS0tVkVSSUYgRk9STScpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGNoYW5nZVVzZXJQaG9uZSh1c2VyRGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmVycm9yID09PSAnbm8nICYmICFyZXNwb25zZS5lcnJvcl9jb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW1vdmVFeGlzdGluZ01lc3NhZ2VzKHZlcmlmaWNhdGlvbkZvcm0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB1c2VyUGhvbmVOdW1iZXIgPSByZXNwb25zZS5waG9uZS5zbGljZSgxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Ym1pdEJ1dHRvbi5pbm5lckhUTUwgPSAn0J/QhtCU0KLQktCV0KDQlNCY0KLQmCc7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWJtaXRCdXR0b24uZGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmVycm9yID09PSAneWVzJyAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZXJyb3JfY29kZSA9PT0gJ2FjY291bnRpbmdfZXJyb3JfMDInXG4gICAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VibWl0QnV0dG9uLmRpc2FibGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93SW5wdXRNZXNzYWdlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVSUk9SX01FU1NBR0VTLlBIT05FX0FMUkVBRFlfVVNFRC5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvbkZvcm0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2Vycm9yJ1xuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy9WZXJpZnkgdXNlciBwaG9uZSBudW1iZXJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVFJZIFZFUklGWSBVU0VSIFBIT05FLS0tVkVSSUYgRk9STScpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdmVyaWZ5VXNlclBob25lKGNpZCk7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlVmVyaWZpY2F0aW9uUmVzcG9uc2UocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IHJlc3BvbnNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVmVyaWZpY2F0aW9uIHByb2Nlc3MgZmFpbGVkOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICBzdWJtaXRCdXR0b24uZGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGNvbmZpcm1hdGlvbiBmb3JtIGhhbmRsZXJcbiAgICAgICAgY29uZmlybWF0aW9uRm9ybS5hZGRFdmVudExpc3RlbmVyKCdzdWJtaXQnLCBhc3luYyAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uZmlybUJ1dHRvbi5kaXNhYmxlZCA9IHRydWU7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc3VibWl0dGVyIHBob25lJywgc3VibWl0dGVkUGhvbmUpO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB2ZXJpZmljYXRpb24gaGFzIGV4cGlyZWRcbiAgICAgICAgICAgIGlmIChjb25maXJtYXRpb25Gb3JtLmRhdGFzZXQuY29uZmlybWF0aW9uRXhwaXJlZCA9PT0gJ3RydWUnKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVzZXQgdGhlIGZvcm0gc3RhdGVcbiAgICAgICAgICAgICAgICBjb25maXJtYXRpb25Gb3JtLmRhdGFzZXQuY29uZmlybWF0aW9uRXhwaXJlZCA9ICdmYWxzZSc7XG4gICAgICAgICAgICAgICAgY29uc3QgY29kZUlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbmZpcm1hdGlvbi1jb2RlJyk7XG4gICAgICAgICAgICAgICAgY29kZUlucHV0LnJlcXVpcmVkID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgbmV3IHZlcmlmaWNhdGlvblxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdUUlkgVkVSSUZZIFVTRVIgUEhPTkUtLS1DT05GIEZPUk0nKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB2ZXJpZnlVc2VyUGhvbmUoY2lkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVWZXJpZmljYXRpb25SZXNwb25zZShyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciByZXNlbmRpbmcgdmVyaWZpY2F0aW9uIGNvZGU6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25maXJtQnV0dG9uLmRpc2FibGVkID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGNvZGUgPSBjb25maXJtYXRpb25Db2RlSW5wdXQudmFsdWU7XG5cbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIGxlbmd0aCBhbmQgbnVtZXJpY1xuICAgICAgICAgICAgaWYgKCEvXlxcZHs1fSQvLnRlc3QoY29kZSkpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnaW5zaWRlIHZhbGlkYXRlIGZuKCkgLS0tY29kZSBpcyBpbnZhbGlkJyk7XG4gICAgICAgICAgICAgICAgY29uZmlybWF0aW9uQ29kZUlucHV0LmNsYXNzTGlzdC5hZGQoJ2lzLWludmFsaWQnKTtcbiAgICAgICAgICAgICAgICBjb25maXJtQnV0dG9uLmRpc2FibGVkID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1RSWSBDT05GSVJNIFVTRVIgUEhPTkUtLS1DT05GIEZPUk0nKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGNvbmZpcm1Vc2VyUGhvbmUoXG4gICAgICAgICAgICAgICAgICAgIGNvZGUsXG4gICAgICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvblNlc3Npb25cbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5mb3JtX193cmFwcGVyJykuc3R5bGUuZGlzcGxheSA9XG4gICAgICAgICAgICAgICAgICAgICAgICAnbm9uZSc7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIGhlYWRlciB0ZXh0IGFuZCBkYXRhLXRyYW5zbGF0ZVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuZm9ybV9faGVhZGVyJyk7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlci50ZXh0Q29udGVudCA9ICfQotCS0IbQmSDQndCe0JzQldCgINCS0JXQoNCY0KTQhtCa0J7QktCQ0J3Qnic7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlci5zZXRBdHRyaWJ1dGUoJ2RhdGEtdHJhbnNsYXRlJywgJ2Zvcm1IZWFkZXJTdWNjZXNzJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIGRlc2NyaXB0aW9uIHRleHQgYW5kIGRhdGEtdHJhbnNsYXRlXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlc2NyaXB0aW9uID1cbiAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5mb3JtX19kZXNjcmlwdGlvbicpO1xuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbi50ZXh0Q29udGVudCA9XG4gICAgICAgICAgICAgICAgICAgICAgICAn0JLQsNGIINC/0LXRgNGB0L7QvdCw0LvRjNC90LjQuSDQsdC+0L3Rg9GBINC30LDRgNCw0YXQvtCy0LDQvdC+INCyINGA0L7Qt9C00ZbQuyBcItCR0L7QvdGD0YHQuFwiJztcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb24uc2V0QXR0cmlidXRlKFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2RhdGEtdHJhbnNsYXRlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdmb3JtRGVzY3JpcHRpb25TdWNjZXNzJ1xuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdWNjZXNzSW1hZ2VXcmFwcGVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcbiAgICAgICAgICAgICAgICAgICAgICAgICcuc3VjY2Vzc0ltYWdlV3JhcHBlcidcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc0ltYWdlV3JhcHBlci5jbGFzc0xpc3QuYWRkKCd2aXNpYmxlJyk7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NJbWFnZVdyYXBwZXIuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGZpcnN0IGRpdlxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaXJzdERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgICAgICAgICBmaXJzdERpdi5jbGFzc05hbWUgPSAnc3VjY2Vzc0ltYWdlV3JhcHBlci1wcml6ZUluZm8nO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpcnN0U3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgICAgICAgICAgZmlyc3RTcGFuLnRleHRDb250ZW50ID0gJ9Ch0KLQoNCQ0KXQntCS0JrQkCDQlNCeJztcbiAgICAgICAgICAgICAgICAgICAgZmlyc3RTcGFuLnNldEF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgICAgICAgICAgICdkYXRhLXRyYW5zbGF0ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAncHJpemVJbmZvSW5zdXJhbmNlJ1xuICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlY29uZFNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICAgICAgICAgIHNlY29uZFNwYW4udGV4dENvbnRlbnQgPSAn0KHQotCQ0JLQmtCYIDEwMCDigrQnO1xuICAgICAgICAgICAgICAgICAgICBzZWNvbmRTcGFuLnNldEF0dHJpYnV0ZSgnZGF0YS10cmFuc2xhdGUnLCAncHJpemVJbmZvVmFsdWUnKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBBcHBlbmQgc3BhbnMgdG8gZmlyc3QgZGl2XG4gICAgICAgICAgICAgICAgICAgIGZpcnN0RGl2LmFwcGVuZENoaWxkKGZpcnN0U3Bhbik7XG4gICAgICAgICAgICAgICAgICAgIGZpcnN0RGl2LmFwcGVuZENoaWxkKHNlY29uZFNwYW4pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBzZWNvbmQgZGl2XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlY29uZERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgICAgICAgICBzZWNvbmREaXYuY2xhc3NOYW1lID0gJ3N1Y2Nlc3NJbWFnZVdyYXBwZXItYm9udXNTcGFyayc7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQXBwZW5kIGRpdnMgdG8gY29udGFpbmVyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NJbWFnZVdyYXBwZXIuYXBwZW5kQ2hpbGQoZmlyc3REaXYpO1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzSW1hZ2VXcmFwcGVyLmFwcGVuZENoaWxkKHNlY29uZERpdik7XG5cbiAgICAgICAgICAgICAgICAgICAgbGlua0J1dHRvbldyYXBwZXIuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGlua0J1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXG4gICAgICAgICAgICAgICAgICAgICAgICAnLmxpbmtfX2J1dHRvbi13cmFwcGVyIGEnXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGxpbmtCdXR0b24uaHJlZiA9ICcvcGVyc29uYWwtb2ZmaWNlL2JvbnVzZXMvYmV0aW5zdXJhbmNlJztcbiAgICAgICAgICAgICAgICAgICAgbGlua0J1dHRvbi50ZXh0Q29udGVudCA9ICfQlNCeINCR0J7QndCj0KHQoyc7XG4gICAgICAgICAgICAgICAgICAgIGxpbmtCdXR0b24uc2V0QXR0cmlidXRlKCdkYXRhLXRyYW5zbGF0ZScsICdjb25maXJtU3VjY2VzcycpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vISBBZGQgdmVyaWZpY2F0aW9uIHJlY29yZFxuICAgICAgICAgICAgICAgICAgICBjb25zdCB1c2VySWQgPSB1c2VyLmRhdGEuYWNjb3VudC5pZDtcblxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBhZGRWZXJpZmljYXRpb24oe1xuICAgICAgICAgICAgICAgICAgICAgICAgdXNlcmlkOiB1c2VySWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwaG9uZTogc3VibWl0dGVkUGhvbmUsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgY29uZmlybWluZyBjb2RlOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgICAgIGVycm9yLmNvZGUgPT09IC00ICYmXG4gICAgICAgICAgICAgICAgICAgIGVycm9yLm1lc3NhZ2UucmVhc29uID09PSAnd3Jvbmdfc2Vzc2lvbl9vcl9jb25maXJtX2NvZGUnXG4gICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgIHNob3dJbnB1dE1lc3NhZ2UoXG4gICAgICAgICAgICAgICAgICAgICAgICBFUlJPUl9NRVNTQUdFUy5JTlZBTElEX0NPTkZJUk1BVElPTl9DT0RFLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maXJtYXRpb25Gb3JtLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2Vycm9yJ1xuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgY29uZmlybUJ1dHRvbi5kaXNhYmxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBsb2FkVHJhbnNsYXRpb25zKCkudGhlbihpbml0KTtcbiAgICAvLyBpbml0KCk7XG5cbiAgICBjb25zdCBtYWluUGFnZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5mYXZfX3BhZ2UnKTtcbiAgICBzZXRUaW1lb3V0KCgpID0+IG1haW5QYWdlLmNsYXNzTGlzdC5hZGQoJ292ZXJmbG93JyksIDEwMDApO1xufSkoKTtcbiJdfQ==
