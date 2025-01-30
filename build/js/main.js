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
    const lang = document.querySelector('.button-lang');

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
            const formContainerSuccess = document.querySelector(
                '.form__container-success'
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
            } else if (success) {
                console.log('success');
                formContainer?.classList.add('hidden');
                formContainer?.classList.remove('visible');
                formContainerSuccessBefore?.classList.add('hidden');
                formContainerSuccessBefore?.classList.remove('visible');

                formContainerSuccess?.classList.remove('hidden');
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

        successBeforeButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('successBeforeButton clicked');
            authorized = false;
            notAuthorized = false;
            success = false;
            successBefore = true;
            updateUIBasedOnState();
        });

        successButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('successButton clicked');
            authorized = false;
            notAuthorized = false;
            success = true;
            successBefore = false;
            updateUIBasedOnState();
        });

        lang.addEventListener('click', (e) => {
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

                    // // Update header text and data-translate
                    // const header = document.querySelector('.form__header');
                    // header.textContent = 'ТВІЙ НОМЕР ВЕРИФІКОВАНО';
                    // header.setAttribute('data-translate', 'formHeaderSuccess');

                    // // Update description text and data-translate
                    // const description =
                    //     document.querySelector('.form__description');
                    // description.textContent =
                    //     'Ваш персональний бонус зараховано в розділ "Бонуси"';
                    // description.setAttribute(
                    //     'data-translate',
                    //     'formDescriptionSuccess'
                    // );
                    // const successImageWrapper = document.querySelector(
                    //     '.successImageWrapper'
                    // );
                    // successImageWrapper.classList.add('visible');
                    // successImageWrapper.classList.remove('hidden');

                    // // Create first div
                    // const firstDiv = document.createElement('div');
                    // firstDiv.className = 'successImageWrapper-prizeInfo';

                    // const firstSpan = document.createElement('span');
                    // firstSpan.textContent = 'СТРАХОВКА ДО';
                    // firstSpan.setAttribute(
                    //     'data-translate',
                    //     'prizeInfoInsurance'
                    // );

                    // const secondSpan = document.createElement('span');
                    // secondSpan.textContent = 'СТАВКИ 100 ₴';
                    // secondSpan.setAttribute('data-translate', 'prizeInfoValue');

                    // // Append spans to first div
                    // firstDiv.appendChild(firstSpan);
                    // firstDiv.appendChild(secondSpan);

                    // // Create second div
                    // const secondDiv = document.createElement('div');
                    // secondDiv.className = 'successImageWrapper-bonusSpark';

                    // // Append divs to container
                    // successImageWrapper.appendChild(firstDiv);
                    // successImageWrapper.appendChild(secondDiv);

                    // linkButtonWrapper.style.display = 'flex';
                    // const linkButton = document.querySelector(
                    //     '.link__button-wrapper a'
                    // );
                    // linkButton.href = '/personal-office/bonuses/betinsurance';
                    // linkButton.textContent = 'ДО БОНУСУ';
                    // linkButton.setAttribute('data-translate', 'confirmSuccess');

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

    document.querySelector(".dark-btn").addEventListener("click", () =>{
        document.body.classList.toggle("dark")
    })
})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uICgpIHtcbiAgICBjb25zdCBFUlJPUl9NRVNTQUdFUyA9IHtcbiAgICAgICAgSU5WQUxJRF9QSE9ORV9GT1JNQVQ6IHtcbiAgICAgICAgICAgIG1lc3NhZ2U6ICfQpNC+0YDQvNCw0YIg0YLQtdC70LXRhNC+0L3RgyDQstC60LDQt9Cw0L3QviDQvdC10L/RgNCw0LLQuNC70YzQvdC+JyxcbiAgICAgICAgICAgIHRyYW5zbGF0ZUtleTogJ2Vycm9ySW52YWxpZFBob25lRm9ybWF0JyxcbiAgICAgICAgfSxcbiAgICAgICAgUEhPTkVfQUxSRUFEWV9VU0VEOiB7XG4gICAgICAgICAgICBtZXNzYWdlOiAn0KbQtdC5INC90L7QvNC10YAg0YLQtdC70LXRhNC+0L3RgyDQstC20LUg0LLQuNC60L7RgNC40YHRgtC+0LLRg9GU0YLRjNGB0Y8nLFxuICAgICAgICAgICAgdHJhbnNsYXRlS2V5OiAnZXJyb3JQaG9uZUFscmVhZHlVc2VkJyxcbiAgICAgICAgfSxcbiAgICAgICAgUEhPTkVfQ09ORklSTUVEX0JZX0FOT1RIRVI6IHtcbiAgICAgICAgICAgIG1lc3NhZ2U6ICfQptC10Lkg0L3QvtC80LXRgCDRgtC10LvQtdGE0L7QvdGDINCx0YPQu9C+INC/0ZbQtNGC0LLQtdGA0LTQttC10L3QviDRltC90YjQuNC8INC60L7RgNC40YHRgtGD0LLQsNGH0LXQvCcsXG4gICAgICAgICAgICB0cmFuc2xhdGVLZXk6ICdlcnJvclBob25lQ29uZmlybWVkQnlBbm90aGVyJyxcbiAgICAgICAgfSxcbiAgICAgICAgVkVSSUZJQ0FUSU9OX0VYUElSRUQ6IHtcbiAgICAgICAgICAgIG1lc3NhZ2U6ICfQp9Cw0YEg0LLQtdGA0LjRhNGW0LrQsNGG0ZbRlyDQvNC40L3Rg9CyJyxcbiAgICAgICAgICAgIHRyYW5zbGF0ZUtleTogJ2Vycm9yVmVyaWZpY2F0aW9uRXhwaXJlZCcsXG4gICAgICAgIH0sXG4gICAgICAgIElOVkFMSURfQ09ORklSTUFUSU9OX0NPREU6IHtcbiAgICAgICAgICAgIG1lc3NhZ2U6ICfQndC10L/RgNCw0LLQuNC70YzQvdC40Lkg0LrQvtC0INC/0ZbQtNGC0LLQtdGA0LTQttC10L3QvdGPJyxcbiAgICAgICAgICAgIHRyYW5zbGF0ZUtleTogJ2Vycm9ySW52YWxpZENvbmZpcm1hdGlvbkNvZGUnLFxuICAgICAgICB9LFxuICAgICAgICBWRVJJRklDQVRJT05fTE9DS0VEOiB7XG4gICAgICAgICAgICBtZXNzYWdlOiAn0LLQtdGA0LjRhNGW0LrQsNGG0ZbRjiDQt9Cw0LHQu9C+0LrQvtCy0LDQvdC+LiDQlNC+0YfQtdC60LDQudGC0LXRgdGMINC+0L3QvtCy0LvQtdC90L3RjyDRgtCw0LnQvNC10YDQsCcsXG4gICAgICAgICAgICB0cmFuc2xhdGVLZXk6ICdlcnJvclZlcmlmaWNhdGlvbkxvY2tlZCcsXG4gICAgICAgIH0sXG4gICAgICAgIFNNU19DT0RFX1RJTUVSOiB7XG4gICAgICAgICAgICBtZXNzYWdlOlxuICAgICAgICAgICAgICAgICfRh9Cw0YEsINGP0LrQuNC5INC30LDQu9C40YjQuNCy0YHRjywg0YnQvtCxINCy0LLQtdGB0YLQuCDQutC+0LQg0LcgU01TLdC/0L7QstGW0LTQvtC80LvQtdC90L3Rjy4g0J/RltGB0LvRjyDQt9Cw0LrRltC90YfQtdC90L3RjyDRh9Cw0YHRgyDQvNC+0LbQvdCwINC30LDQv9GA0L7RgdC40YLQuCDQutC+0LQg0L/QvtCy0YLQvtGA0L3QvicsXG4gICAgICAgICAgICB0cmFuc2xhdGVLZXk6ICdzbXNDb2RlVGltZXInLFxuICAgICAgICB9LFxuICAgIH07XG4gICAgY29uc3QgQVBJID0gJ2h0dHBzOi8vZmF2LXByb20uY29tJztcbiAgICBjb25zdCBFTkRQT0lOVCA9ICdhcGlfdmVyaWZpY2F0aW9uJztcblxuICAgIC8vICNyZWdpb24gVHJhbnNsYXRpb25cbiAgICBjb25zdCB1a0xlbmcgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjdWtMZW5nJyk7XG4gICAgY29uc3QgZW5MZW5nID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2VuTGVuZycpO1xuICAgIC8vIGxldCBsb2NhbGUgPSAndWsnO1xuXG4gICAgLy9sb2NhbGUgdGVzdFxuICAgIGxldCBsb2NhbGUgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKCdsb2NhbGUnKVxuICAgICAgICA/IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oJ2xvY2FsZScpXG4gICAgICAgIDogJ3VrJztcbiAgICBpZiAodWtMZW5nKSBsb2NhbGUgPSAndWsnO1xuICAgIGlmIChlbkxlbmcpIGxvY2FsZSA9ICdlbic7XG5cbiAgICBsZXQgaTE4bkRhdGEgPSB7fTtcblxuICAgIGZ1bmN0aW9uIGxvYWRUcmFuc2xhdGlvbnMoKSB7XG4gICAgICAgIHJldHVybiBmZXRjaChgJHtBUEl9LyR7RU5EUE9JTlR9L3RyYW5zbGF0ZXMvJHtsb2NhbGV9YClcbiAgICAgICAgICAgIC50aGVuKChyZXMpID0+IHJlcy5qc29uKCkpXG4gICAgICAgICAgICAudGhlbigoanNvbikgPT4ge1xuICAgICAgICAgICAgICAgIGkxOG5EYXRhID0ganNvbjtcbiAgICAgICAgICAgICAgICB0cmFuc2xhdGUoKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IG11dGF0aW9uT2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbiAoXG4gICAgICAgICAgICAgICAgICAgIG11dGF0aW9uc1xuICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2xhdGUoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBtdXRhdGlvbk9ic2VydmVyLm9ic2VydmUoXG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd2ZXJpZmljYXRpb24nKSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRMaXN0OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3VidHJlZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0cmFuc2xhdGUoKSB7XG4gICAgICAgIGNvbnN0IGVsZW1zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtdHJhbnNsYXRlXScpO1xuICAgICAgICBpZiAoZWxlbXMgJiYgZWxlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBlbGVtcy5mb3JFYWNoKChlbGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qga2V5ID0gZWxlbS5nZXRBdHRyaWJ1dGUoJ2RhdGEtdHJhbnNsYXRlJyk7XG4gICAgICAgICAgICAgICAgZWxlbS5pbm5lckhUTUwgPSB0cmFuc2xhdGVLZXkoa2V5KTtcbiAgICAgICAgICAgICAgICBlbGVtLnJlbW92ZUF0dHJpYnV0ZSgnZGF0YS10cmFuc2xhdGUnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxvY2FsZSA9PT0gJ2VuJykge1xuICAgICAgICAgICAgbWFpblBhZ2UuY2xhc3NMaXN0LmFkZCgnZW4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlZnJlc2hMb2NhbGl6ZWRDbGFzcygpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyYW5zbGF0ZUtleShrZXkpIHtcbiAgICAgICAgaWYgKCFrZXkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgaTE4bkRhdGFba2V5XSB8fCAnKi0tLS1ORUVEIFRPIEJFIFRSQU5TTEFURUQtLS0tKiAgIGtleTogICcgKyBrZXlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZWZyZXNoTG9jYWxpemVkQ2xhc3MoZWxlbWVudCwgYmFzZUNzc0NsYXNzKSB7XG4gICAgICAgIGlmICghZWxlbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgbGFuZyBvZiBbJ3VrJywgJ2VuJ10pIHtcbiAgICAgICAgICAgIGVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShiYXNlQ3NzQ2xhc3MgKyBsYW5nKTtcbiAgICAgICAgfVxuICAgICAgICBlbGVtZW50LmNsYXNzTGlzdC5hZGQoYmFzZUNzc0NsYXNzICsgbG9jYWxlKTtcbiAgICB9XG5cbiAgICAvLyAjZW5kcmVnaW9uXG5cbiAgICBhc3luYyBmdW5jdGlvbiBnZXRVc2VyKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzID0gYXdhaXQgd2luZG93LkZFLnNvY2tldF9zZW5kKHtcbiAgICAgICAgICAgICAgICBjbWQ6ICdnZXRfdXNlcicsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnZXRVc2VyIHJlc3BvbnNlJywgcmVzKTtcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBmZXRjaGluZyB1c2VyOicsIGVycm9yKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgZnVuY3Rpb24gdmVyaWZ5VXNlclBob25lKGNpZCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzID0gYXdhaXQgd2luZG93LkZFLnNvY2tldF9zZW5kKHtcbiAgICAgICAgICAgICAgICBjbWQ6ICdhY2NvdW50aW5nL3VzZXJfcGhvbmVfdmVyaWZ5JyxcbiAgICAgICAgICAgICAgICBjaWQsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd2ZXJpZnlVc2VyUGhvbmUgcmVzcG9uc2UnLCByZXMpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHZlcmlmeWluZyB1c2VyIHBob25lOicsIGVycm9yKTtcblxuICAgICAgICAgICAgcmV0dXJuIGVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgZnVuY3Rpb24gY2hhbmdlVXNlclBob25lKHVzZXJEYXRhKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKCcvYWNjb3VudGluZy9hcGkvY2hhbmdlX3VzZXInLCB7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgYm9keTogdXNlckRhdGEsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnY2hhbmdlVXNlclBob25lIHJlc3BvbnNlOicsIGRhdGEpO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjaGFuZ2luZyB1c2VyIHBob25lOicsIGVycm9yKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgZnVuY3Rpb24gY29uZmlybVVzZXJQaG9uZShjb25maXJtQ29kZSwgc2Vzc2lvbklkKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXMgPSBhd2FpdCB3aW5kb3cuRkUuc29ja2V0X3NlbmQoe1xuICAgICAgICAgICAgICAgIGNtZDogJ2FjY291bnRpbmcvdXNlcl9waG9uZV9jb25maXJtJyxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpcm1fY29kZTogYCR7Y29uZmlybUNvZGV9YCxcbiAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbl9pZDogYCR7c2Vzc2lvbklkfWAsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnY29uZmlybVVzZXJQaG9uZSByZXNwb25zZScsIHJlcyk7XG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgY29uZmlybWluZyB1c2VyIHBob25lOicsIGVycm9yKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgZnVuY3Rpb24gYWRkVmVyaWZpY2F0aW9uKGRhdGEpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IGZldGNoKGAke0FQSX0vJHtFTkRQT0lOVH1gLCB7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGFkZGluZyB2ZXJpZmljYXRpb246JywgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93SW5wdXRNZXNzYWdlKG1lc3NhZ2UsIHRhcmdldEVsZW1lbnQsIHN0YXRlID0gZmFsc2UpIHtcbiAgICAgICAgY29uc3QgaW5wdXRFbGVtZW50ID0gdGFyZ2V0RWxlbWVudC5xdWVyeVNlbGVjdG9yKCdpbnB1dCcpO1xuICAgICAgICBjb25zdCBidXR0b25FbGVtZW50ID0gdGFyZ2V0RWxlbWVudC5xdWVyeVNlbGVjdG9yKCdidXR0b24nKTtcblxuICAgICAgICAvLyBSZW1vdmUgYWxsIG1lc3NhZ2VzIGlmIGNhbGxlZCBmcm9tIHRpbWVyIGV4cGlyYXRpb25cbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgdGFyZ2V0RWxlbWVudC5pZCA9PT0gJ2NvbmZpcm1hdGlvbl9fZm9ybScgJiZcbiAgICAgICAgICAgIHRhcmdldEVsZW1lbnQuZGF0YXNldC5jb25maXJtYXRpb25FeHBpcmVkID09PSAndHJ1ZSdcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBjb25zdCBhbGxNZXNzYWdlcyA9IHRhcmdldEVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmlucHV0LW1zZycpO1xuICAgICAgICAgICAgYWxsTWVzc2FnZXMuZm9yRWFjaCgobXNnKSA9PiBtc2cucmVtb3ZlKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmluZCBlcnJvciBtZXNzYWdlIG9iamVjdCBpZiBpdCBleGlzdHNcbiAgICAgICAgbGV0IGVycm9yT2JqID0gbnVsbDtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gRVJST1JfTUVTU0FHRVMpIHtcbiAgICAgICAgICAgIGlmIChFUlJPUl9NRVNTQUdFU1trZXldLm1lc3NhZ2UgPT09IG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICBlcnJvck9iaiA9IEVSUk9SX01FU1NBR0VTW2tleV07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBmb3IgZXhpc3RpbmcgbWVzc2FnZXMgd2l0aCB0aGUgc2FtZSBjb250ZW50XG4gICAgICAgIGNvbnN0IGV4aXN0aW5nTWVzc2FnZXMgPSB0YXJnZXRFbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5pbnB1dC1tc2cnKTtcbiAgICAgICAgZm9yIChjb25zdCBtc2cgb2YgZXhpc3RpbmdNZXNzYWdlcykge1xuICAgICAgICAgICAgaWYgKG1zZy5oYXNBdHRyaWJ1dGUoJ2RhdGEtY29kZS1lcnJvcicpKSBjb250aW51ZTtcblxuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobWVzc2FnZSkgJiYgbWVzc2FnZS5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0aW1lcldyYXBwZXIgPSBtc2cucXVlcnlTZWxlY3RvcignLnRpbWVyV3JhcHBlcicpO1xuICAgICAgICAgICAgICAgIGlmICh0aW1lcldyYXBwZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGltZXIgPSB0aW1lcldyYXBwZXIucXVlcnlTZWxlY3RvcignLnRpbWVyJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aW1lcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGltZXIudGV4dENvbnRlbnQgPSBtZXNzYWdlWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChtc2cudGV4dENvbnRlbnQgPT09IG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG1zZy5yZW1vdmUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSBuZXcgbWVzc2FnZSBlbGVtZW50XG4gICAgICAgIGNvbnN0IG1lc3NhZ2VFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIG1lc3NhZ2VFbGVtZW50LmNsYXNzTGlzdC5hZGQoJ2lucHV0LW1zZycpO1xuXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KG1lc3NhZ2UpICYmIG1lc3NhZ2UubGVuZ3RoID09PSAyKSB7XG4gICAgICAgICAgICBjb25zdCB0aW1lcldyYXBwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIHRpbWVyV3JhcHBlci5jbGFzc0xpc3QuYWRkKCd0aW1lcldyYXBwZXInKTtcbiAgICAgICAgICAgIHRpbWVyV3JhcHBlci5zdHlsZS5taW5XaWR0aCA9IHN0YXRlID8gJzY1cHgnIDogJzQ1cHgnO1xuXG4gICAgICAgICAgICBjb25zdCBmaXJzdFNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICBmaXJzdFNwYW4udGV4dENvbnRlbnQgPSBtZXNzYWdlWzBdO1xuICAgICAgICAgICAgZmlyc3RTcGFuLmNsYXNzTGlzdC5hZGQoJ3RpbWVyJyk7XG5cbiAgICAgICAgICAgIHRpbWVyV3JhcHBlci5hcHBlbmRDaGlsZChmaXJzdFNwYW4pO1xuXG4gICAgICAgICAgICBjb25zdCBzZWNvbmRTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgc2Vjb25kU3Bhbi50ZXh0Q29udGVudCA9IG1lc3NhZ2VbMV07XG4gICAgICAgICAgICBzZWNvbmRTcGFuLmNsYXNzTGlzdC5hZGQoc3RhdGUgPyAnZXJyb3InIDogJ3dhcm5pbmcnKTtcblxuICAgICAgICAgICAgLy8gQWRkIHRyYW5zbGF0aW9uIGtleSBpZiBtZXNzYWdlIG1hdGNoZXMgdGhlIHZlcmlmaWNhdGlvbiBsb2NrZWQgb3IgU01TIHRpbWVyIG1lc3NhZ2VcbiAgICAgICAgICAgIGlmIChtZXNzYWdlWzFdID09PSBFUlJPUl9NRVNTQUdFUy5WRVJJRklDQVRJT05fTE9DS0VELm1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICBzZWNvbmRTcGFuLnNldEF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgICAgICAgJ2RhdGEtdHJhbnNsYXRlJyxcbiAgICAgICAgICAgICAgICAgICAgRVJST1JfTUVTU0FHRVMuVkVSSUZJQ0FUSU9OX0xPQ0tFRC50cmFuc2xhdGVLZXlcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlWzFdID09PSBFUlJPUl9NRVNTQUdFUy5TTVNfQ09ERV9USU1FUi5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgc2Vjb25kU3Bhbi5zZXRBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgICAgICAgICdkYXRhLXRyYW5zbGF0ZScsXG4gICAgICAgICAgICAgICAgICAgIEVSUk9SX01FU1NBR0VTLlNNU19DT0RFX1RJTUVSLnRyYW5zbGF0ZUtleVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG1lc3NhZ2VFbGVtZW50LmFwcGVuZENoaWxkKHRpbWVyV3JhcHBlcik7XG4gICAgICAgICAgICBtZXNzYWdlRWxlbWVudC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnICcpKTtcbiAgICAgICAgICAgIG1lc3NhZ2VFbGVtZW50LmFwcGVuZENoaWxkKHNlY29uZFNwYW4pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWVzc2FnZUVsZW1lbnQudGV4dENvbnRlbnQgPSBtZXNzYWdlO1xuXG4gICAgICAgICAgICAvLyBBZGQgdHJhbnNsYXRpb24ga2V5IGlmIGVycm9yIG1lc3NhZ2UgZXhpc3RzIGluIG91ciBzdHJ1Y3R1cmVcbiAgICAgICAgICAgIGlmIChlcnJvck9iaikge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VFbGVtZW50LnNldEF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgICAgICAgJ2RhdGEtdHJhbnNsYXRlJyxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JPYmoudHJhbnNsYXRlS2V5XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIG1lc3NhZ2VFbGVtZW50LmNsYXNzTGlzdC5hZGQoc3RhdGUgPyAnZXJyb3InIDogJ3dhcm5pbmcnKTtcblxuICAgICAgICAvLyBIYW5kbGUgbWVzc2FnZSBwb3NpdGlvbmluZ1xuICAgICAgICBpZiAobWVzc2FnZSA9PT0gJ9Cd0LXQv9GA0LDQstC40LvRjNC90LjQuSDQutC+0LQg0L/RltC00YLQstC10YDQtNC20LXQvdC90Y8nKSB7XG4gICAgICAgICAgICBtZXNzYWdlRWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2RhdGEtY29kZS1lcnJvcicsICd0cnVlJyk7XG4gICAgICAgICAgICAvLyBBbHdheXMgaW5zZXJ0IGVycm9yIG1lc3NhZ2VzIGF0IHRoZSB0b3BcbiAgICAgICAgICAgIGlucHV0RWxlbWVudC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShcbiAgICAgICAgICAgICAgICBtZXNzYWdlRWxlbWVudCxcbiAgICAgICAgICAgICAgICBpbnB1dEVsZW1lbnQubmV4dFNpYmxpbmdcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIC8vIE1vdmUgYW55IGV4aXN0aW5nIG5vbi1lcnJvciBtZXNzYWdlcyBiZWxvdyB0aGlzIG9uZVxuICAgICAgICAgICAgY29uc3Qgb3RoZXJNZXNzYWdlcyA9IHRhcmdldEVsZW1lbnQucXVlcnlTZWxlY3RvckFsbChcbiAgICAgICAgICAgICAgICAnLmlucHV0LW1zZzpub3QoW2RhdGEtY29kZS1lcnJvcl0pJ1xuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIG90aGVyTWVzc2FnZXMuZm9yRWFjaCgobXNnKSA9PiB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZUVsZW1lbnQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoXG4gICAgICAgICAgICAgICAgICAgIG1zZyxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZUVsZW1lbnQubmV4dFNpYmxpbmdcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGb3Igbm9uLWVycm9yIG1lc3NhZ2VzLCBpbnNlcnQgYWZ0ZXIgYW55IGV4aXN0aW5nIGVycm9yIG1lc3NhZ2UsIG9yIGJlZm9yZSB0aGUgYnV0dG9uXG4gICAgICAgICAgICBjb25zdCBleGlzdGluZ0Vycm9yTXNnID1cbiAgICAgICAgICAgICAgICB0YXJnZXRFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWNvZGUtZXJyb3JdJyk7XG4gICAgICAgICAgICBjb25zdCBpbnNlcnRCZWZvcmUgPSBleGlzdGluZ0Vycm9yTXNnXG4gICAgICAgICAgICAgICAgPyBleGlzdGluZ0Vycm9yTXNnLm5leHRTaWJsaW5nXG4gICAgICAgICAgICAgICAgOiBidXR0b25FbGVtZW50O1xuICAgICAgICAgICAgaW5wdXRFbGVtZW50LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG1lc3NhZ2VFbGVtZW50LCBpbnNlcnRCZWZvcmUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNQaG9uZVZhbGlkKHBob25lKSB7XG4gICAgICAgIGNvbnN0IHBob25lUmVnZXggPSAvXlxcKzM4MFxcZHs5fSQvO1xuICAgICAgICByZXR1cm4gcGhvbmVSZWdleC50ZXN0KHBob25lKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZW1vdmVFeGlzdGluZ01lc3NhZ2VzKHRhcmdldEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgZXhpc3RpbmdNZXNzYWdlcyA9IHRhcmdldEVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmlucHV0LW1zZycpO1xuICAgICAgICBleGlzdGluZ01lc3NhZ2VzLmZvckVhY2goKG1zZykgPT4gbXNnLnJlbW92ZSgpKTtcbiAgICB9XG5cbiAgICBjb25zdCBwaG9uZUlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Bob25lJyk7XG4gICAgY29uc3QgY29uZmlybWF0aW9uQ29kZUlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbmZpcm1hdGlvbi1jb2RlJyk7XG4gICAgY29uc3QgdmVyaWZpY2F0aW9uRm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd2ZXJpZmljYXRpb25fX2Zvcm0nKTtcbiAgICBjb25zdCBsaW5rQnV0dG9uV3JhcHBlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5saW5rX19idXR0b24td3JhcHBlcicpO1xuICAgIGNvbnN0IHN1Ym1pdEJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzdWJtaXQtYnV0dG9uJyk7XG5cbiAgICAvL1Rlc3QgYnV0dG9uc1xuICAgIGNvbnN0IGF1dGhvcml6ZWRCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYnV0dG9uLWF1dGhvcml6ZWQnKTtcbiAgICBjb25zdCBub3RBdXRob3JpemVkQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmJ1dHRvbi1ub3RBdXRob3JpemVkJyk7XG4gICAgY29uc3Qgc3VjY2Vzc0J1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5idXR0b24tc3VjY2VzcycpO1xuICAgIGNvbnN0IHN1Y2Nlc3NCZWZvcmVCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYnV0dG9uLXN1Y2Nlc3NCZWZvcmUnKTtcbiAgICBjb25zdCBsYW5nID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmJ1dHRvbi1sYW5nJyk7XG5cbiAgICAvL1N0YXRlc1xuICAgIGxldCBhdXRob3JpemVkID0gZmFsc2U7XG4gICAgbGV0IG5vdEF1dGhvcml6ZWQgPSB0cnVlO1xuICAgIGxldCBzdWNjZXNzID0gZmFsc2U7XG4gICAgbGV0IHN1Y2Nlc3NCZWZvcmUgPSBmYWxzZTtcblxuICAgIGFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCclYyBpbml0IGZpcmVkJywgJ2NvbG9yOiAjMDBmZjAwOyBmb250LXdlaWdodDogYm9sZCcpO1xuICAgICAgICBjb25zb2xlLmxvZygnJWMgaW5pdCBmaXJlZCcsICdjb2xvcjogIzAwZmYwMDsgZm9udC13ZWlnaHQ6IGJvbGQnKTtcbiAgICAgICAgLy8gbGV0IHVzZXJQaG9uZU51bWJlciA9IG51bGw7XG4gICAgICAgIC8vIGxldCB1c2VyUGhvbmVWZXJpZmllZCA9IGZhbHNlO1xuXG4gICAgICAgIGNvbnN0IHVwZGF0ZVVJQmFzZWRPblN0YXRlID0gKCkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1VwZGF0aW5nIFVJLCBzdGF0ZXM6Jywge1xuICAgICAgICAgICAgICAgIGF1dGhvcml6ZWQsXG4gICAgICAgICAgICAgICAgbm90QXV0aG9yaXplZCxcbiAgICAgICAgICAgICAgICBzdWNjZXNzQmVmb3JlLFxuICAgICAgICAgICAgICAgIHN1Y2Nlc3MsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1XcmFwcGVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmZvcm1fX3dyYXBwZXInKTtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1Db250YWluZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuZm9ybV9fY29udGFpbmVyJyk7XG4gICAgICAgICAgICBjb25zdCBmb3JtQ29udGFpbmVyU3VjY2Vzc0JlZm9yZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXG4gICAgICAgICAgICAgICAgJy5mb3JtX19jb250YWluZXItc3VjY2Vzc0JlZm9yZSdcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBjb25zdCBmb3JtQ29udGFpbmVyU3VjY2VzcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXG4gICAgICAgICAgICAgICAgJy5mb3JtX19jb250YWluZXItc3VjY2VzcydcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIC8vIFJlc2V0IGFsbCBzdGF0ZXMgZmlyc3RcbiAgICAgICAgICAgIC8vIGZvcm1XcmFwcGVyPy5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nLCAndmlzaWJsZScpO1xuICAgICAgICAgICAgLy8gZm9ybUNvbnRhaW5lcj8uY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJywgJ3Zpc2libGUnKTtcbiAgICAgICAgICAgIC8vIHZlcmlmaWNhdGlvbkZvcm0/LmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicsICd2aXNpYmxlJyk7XG5cbiAgICAgICAgICAgIGlmIChub3RBdXRob3JpemVkKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vdCBhdXRob3JpemVkJyk7XG4gICAgICAgICAgICAgICAgZm9ybVdyYXBwZXI/LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIGxpbmtCdXR0b25XcmFwcGVyPy5jbGFzc0xpc3QuYWRkKCd2aXNpYmxlJyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGF1dGhvcml6ZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnYXV0aG9yaXplZCcpO1xuICAgICAgICAgICAgICAgIGxpbmtCdXR0b25XcmFwcGVyPy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICBsaW5rQnV0dG9uV3JhcHBlcj8uY2xhc3NMaXN0LnJlbW92ZSgndmlzaWJsZScpO1xuXG4gICAgICAgICAgICAgICAgZm9ybVdyYXBwZXI/LmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvbkZvcm0/LmNsYXNzTGlzdC5hZGQoJ3Zpc2libGUnKTtcbiAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25Gb3JtPy5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3VjY2Vzc0JlZm9yZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzdWNjZXNzQmVmb3JlJyk7XG4gICAgICAgICAgICAgICAgZm9ybUNvbnRhaW5lcj8uY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgZm9ybUNvbnRhaW5lclN1Y2Nlc3NCZWZvcmU/LmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3N1Y2Nlc3MnKTtcbiAgICAgICAgICAgICAgICBmb3JtQ29udGFpbmVyPy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICBmb3JtQ29udGFpbmVyPy5jbGFzc0xpc3QucmVtb3ZlKCd2aXNpYmxlJyk7XG4gICAgICAgICAgICAgICAgZm9ybUNvbnRhaW5lclN1Y2Nlc3NCZWZvcmU/LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIGZvcm1Db250YWluZXJTdWNjZXNzQmVmb3JlPy5jbGFzc0xpc3QucmVtb3ZlKCd2aXNpYmxlJyk7XG5cbiAgICAgICAgICAgICAgICBmb3JtQ29udGFpbmVyU3VjY2Vzcz8uY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgYXV0aG9yaXplZEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnYXV0aG9yaXplZEJ1dHRvbiBjbGlja2VkJyk7XG5cbiAgICAgICAgICAgIGF1dGhvcml6ZWQgPSB0cnVlO1xuICAgICAgICAgICAgbm90QXV0aG9yaXplZCA9IGZhbHNlO1xuICAgICAgICAgICAgc3VjY2VzcyA9IGZhbHNlO1xuICAgICAgICAgICAgc3VjY2Vzc0JlZm9yZSA9IGZhbHNlO1xuICAgICAgICAgICAgdXBkYXRlVUlCYXNlZE9uU3RhdGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbm90QXV0aG9yaXplZEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnbm90QXV0aG9yaXplZEJ1dHRvbiBjbGlja2VkJyk7XG4gICAgICAgICAgICBhdXRob3JpemVkID0gZmFsc2U7XG4gICAgICAgICAgICBub3RBdXRob3JpemVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHN1Y2Nlc3MgPSBmYWxzZTtcbiAgICAgICAgICAgIHN1Y2Nlc3NCZWZvcmUgPSBmYWxzZTtcbiAgICAgICAgICAgIHVwZGF0ZVVJQmFzZWRPblN0YXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHN1Y2Nlc3NCZWZvcmVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3N1Y2Nlc3NCZWZvcmVCdXR0b24gY2xpY2tlZCcpO1xuICAgICAgICAgICAgYXV0aG9yaXplZCA9IGZhbHNlO1xuICAgICAgICAgICAgbm90QXV0aG9yaXplZCA9IGZhbHNlO1xuICAgICAgICAgICAgc3VjY2VzcyA9IGZhbHNlO1xuICAgICAgICAgICAgc3VjY2Vzc0JlZm9yZSA9IHRydWU7XG4gICAgICAgICAgICB1cGRhdGVVSUJhc2VkT25TdGF0ZSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICBzdWNjZXNzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzdWNjZXNzQnV0dG9uIGNsaWNrZWQnKTtcbiAgICAgICAgICAgIGF1dGhvcml6ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIG5vdEF1dGhvcml6ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHN1Y2Nlc3MgPSB0cnVlO1xuICAgICAgICAgICAgc3VjY2Vzc0JlZm9yZSA9IGZhbHNlO1xuICAgICAgICAgICAgdXBkYXRlVUlCYXNlZE9uU3RhdGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbGFuZy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpZiAobG9jYWxlID09PSAndWsnKSB7XG4gICAgICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbSgnbG9jYWxlJywgJ2VuJyk7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChsb2NhbGUgPT09ICdlbicpIHtcbiAgICAgICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKCdsb2NhbGUnLCAndWsnKTtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsIFVJIHVwZGF0ZVxuICAgICAgICB1cGRhdGVVSUJhc2VkT25TdGF0ZSgpO1xuXG4gICAgICAgIC8vIGlmICh3aW5kb3cuRkU/LnVzZXIucm9sZSA9PT0gJ2d1ZXN0Jykge1xuICAgICAgICAvLyAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmZvcm1fX3dyYXBwZXInKS5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgLy8gICAgIGxpbmtCdXR0b25XcmFwcGVyLmNsYXNzTGlzdC5hZGQoJ3Zpc2libGUnKTtcbiAgICAgICAgLy8gICAgIGxpbmtCdXR0b25XcmFwcGVyLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuXG4gICAgICAgIC8vICAgICByZXR1cm47XG4gICAgICAgIC8vIH0gZWxzZSB7XG4gICAgICAgIC8vICAgICB2ZXJpZmljYXRpb25Gb3JtLmNsYXNzTGlzdC5hZGQoJ3Zpc2libGUnKTtcbiAgICAgICAgLy8gICAgIHZlcmlmaWNhdGlvbkZvcm0uY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG4gICAgICAgIC8vIH1cblxuICAgICAgICBjb25zdCBjb25maXJtYXRpb25Gb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbmZpcm1hdGlvbl9fZm9ybScpO1xuICAgICAgICBjb25zdCBjb25maXJtQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbmZpcm0tYnV0dG9uJyk7XG5cbiAgICAgICAgbGV0IHZlcmlmaWNhdGlvblNlc3Npb24gPSBudWxsO1xuICAgICAgICBsZXQgdmVyaWZpY2F0aW9uVGltZXIgPSBudWxsO1xuICAgICAgICBsZXQgdXNlciA9IG51bGw7XG4gICAgICAgIGxldCBjaWQgPSBudWxsO1xuXG4gICAgICAgIGxldCBzdWJtaXR0ZWRQaG9uZSA9IG51bGw7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIHVzZXIgPSBhd2FpdCBnZXRVc2VyKCk7XG4gICAgICAgICAgICAvLyBjaWQgPSB1c2VyLmNpZDtcbiAgICAgICAgICAgIC8vIHVzZXJQaG9uZU51bWJlciA9IHVzZXIuZGF0YS5hY2NvdW50LnBob25lX251bWJlcjtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCd1c2VyUGhvbmVOdW1iZXI6JywgdXNlclBob25lTnVtYmVyKTtcbiAgICAgICAgICAgIC8vIHVzZXJQaG9uZVZlcmlmaWVkID0gdXNlci5kYXRhLmFjY291bnQuYWNjb3VudF9zdGF0dXMuZmluZChcbiAgICAgICAgICAgIC8vICAgICAoc3RhdHVzKSA9PiBzdGF0dXMuYWxpYXMgPT09ICdJU19QSE9ORV9WRVJJRklFRCdcbiAgICAgICAgICAgIC8vICkudmFsdWU7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygndXNlclBob25lVmVyaWZpZWQ6JywgdXNlclBob25lVmVyaWZpZWQpO1xuICAgICAgICAgICAgLy8gdXNlclBob25lTnVtYmVyID0gdHJ1ZTtcbiAgICAgICAgICAgIC8vIHVzZXJQaG9uZVZlcmlmaWVkID0gdHJ1ZTtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHVzZXIgaGFzIGEgbnVtYmVyIGFuZCBpcyBhbHJlYWR5IHZlcmlmaWVkXG4gICAgICAgICAgICAvLyBpZiAodXNlclBob25lTnVtYmVyICYmIHVzZXJQaG9uZVZlcmlmaWVkKSB7XG4gICAgICAgICAgICAvLyAgICAgZG9jdW1lbnRcbiAgICAgICAgICAgIC8vICAgICAgICAgLnF1ZXJ5U2VsZWN0b3IoJy5mb3JtX19jb250YWluZXInKVxuICAgICAgICAgICAgLy8gICAgICAgICAuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgICAgICAgICAvLyAgICAgZG9jdW1lbnRcbiAgICAgICAgICAgIC8vICAgICAgICAgLnF1ZXJ5U2VsZWN0b3IoJy5mb3JtX19jb250YWluZXItc3VjY2Vzc0JlZm9yZScpXG4gICAgICAgICAgICAvLyAgICAgICAgIC5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIC8vICAgICByZXR1cm47XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICAvLyB2ZXJpZmljYXRpb25Gb3JtLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuICAgICAgICAgICAgLy8gdmVyaWZpY2F0aW9uRm9ybS5jbGFzc0xpc3QuYWRkKCd2aXNpYmxlJyk7XG4gICAgICAgICAgICAvLyBwaG9uZUlucHV0LnZhbHVlID0gYCske3VzZXJQaG9uZU51bWJlcn1gO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGdldCB1c2VyOicsIGVycm9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN0YXJ0VmVyaWZpY2F0aW9uVGltZXIgPSAoXG4gICAgICAgICAgICB0b3RhbFNlY29uZHMsXG4gICAgICAgICAgICB7IGNvbmZpcm1hdGlvbiA9IGZhbHNlLCB2ZXJpZmljYXRpb24gPSBmYWxzZSB9XG4gICAgICAgICkgPT4ge1xuICAgICAgICAgICAgY29uZmlybUJ1dHRvbi50ZXh0Q29udGVudCA9ICfQndCQ0JTQhtCh0JvQkNCi0JgnO1xuICAgICAgICAgICAgY29uZmlybUJ1dHRvbi5zZXRBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgICAgJ2RhdGEtdHJhbnNsYXRlJyxcbiAgICAgICAgICAgICAgICAnc2VuZENvbmZpcm1hdGlvbkNvZGUnXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICBpZiAodmVyaWZpY2F0aW9uVGltZXIpIHtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHZlcmlmaWNhdGlvblRpbWVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IHRpbWVMZWZ0ID0gdG90YWxTZWNvbmRzO1xuXG4gICAgICAgICAgICB2ZXJpZmljYXRpb25UaW1lciA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGltZUxlZnQgPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHZlcmlmaWNhdGlvblRpbWVyKTtcblxuICAgICAgICAgICAgICAgICAgICBjb25maXJtQnV0dG9uLmRpc2FibGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpcm1CdXR0b24udGV4dENvbnRlbnQgPSAn0J3QkNCU0IbQodCb0JDQotCYINCf0J7QktCi0J7QoNCd0J4nO1xuICAgICAgICAgICAgICAgICAgICBjb25maXJtQnV0dG9uLnNldEF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgICAgICAgICAgICdkYXRhLXRyYW5zbGF0ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAncmVzZW5kQ29uZmlybWF0aW9uQ29kZSdcbiAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgICAgICByZW1vdmVFeGlzdGluZ01lc3NhZ2VzKHZlcmlmaWNhdGlvbkZvcm0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlc2V0IHRoZSBmb3JtIGFuZCByZW1vdmUgcmVxdWlyZWQgYXR0cmlidXRlXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvZGVJbnB1dCA9XG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29uZmlybWF0aW9uLWNvZGUnKTtcbiAgICAgICAgICAgICAgICAgICAgY29kZUlucHV0LnZhbHVlID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIGNvZGVJbnB1dC5yZXF1aXJlZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIENoYW5nZSBmb3JtIHN1Ym1pdCBiZWhhdmlvciB0byB2ZXJpZmljYXRpb24gYW5kIHRyaWdnZXIgY2xlYW51cFxuICAgICAgICAgICAgICAgICAgICBjb25maXJtYXRpb25Gb3JtLmRhdGFzZXQuY29uZmlybWF0aW9uRXhwaXJlZCA9ICd0cnVlJztcblxuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IG1lc3NhZ2UgYWJvdXQgZXhwaXJlZCBjb2RlIChjbGVhbnVwIHdpbGwgaGFwcGVuIGluIHNob3dJbnB1dE1lc3NhZ2UpXG4gICAgICAgICAgICAgICAgICAgIHNob3dJbnB1dE1lc3NhZ2UoXG4gICAgICAgICAgICAgICAgICAgICAgICBFUlJPUl9NRVNTQUdFUy5WRVJJRklDQVRJT05fRVhQSVJFRC5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlybWF0aW9uRm9ybSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdlcnJvcidcbiAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgbWludXRlcyA9IE1hdGguZmxvb3IodGltZUxlZnQgLyA2MCk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2Vjb25kcyA9IHRpbWVMZWZ0ICUgNjA7XG5cbiAgICAgICAgICAgICAgICBpZiAodmVyaWZpY2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHNob3dJbnB1dE1lc3NhZ2UoXG4gICAgICAgICAgICAgICAgICAgICAgICBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYCR7TWF0aC5mbG9vcih0aW1lTGVmdCAvIDM2MDApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50b1N0cmluZygpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5wYWRTdGFydCgyLCAnMCcpfToke01hdGguZmxvb3IoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh0aW1lTGVmdCAlIDM2MDApIC8gNjBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50b1N0cmluZygpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5wYWRTdGFydCgyLCAnMCcpfTokeyh0aW1lTGVmdCAlIDYwKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAudG9TdHJpbmcoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucGFkU3RhcnQoMiwgJzAnKX1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVSUk9SX01FU1NBR0VTLlZFUklGSUNBVElPTl9MT0NLRUQubWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25Gb3JtLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2Vycm9yJ1xuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChjb25maXJtYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgc2hvd0lucHV0TWVzc2FnZShcbiAgICAgICAgICAgICAgICAgICAgICAgIFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBgJHttaW51dGVzLnRvU3RyaW5nKCkucGFkU3RhcnQoMiwgJzAnKX06JHtzZWNvbmRzLnRvU3RyaW5nKCkucGFkU3RhcnQoMiwgJzAnKX1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVSUk9SX01FU1NBR0VTLlNNU19DT0RFX1RJTUVSLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlybWF0aW9uRm9ybSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZhbHNlXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRpbWVMZWZ0LS07XG4gICAgICAgICAgICB9LCAxMDAwKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBoYW5kbGVWZXJpZmljYXRpb25SZXNwb25zZSA9IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgICAgJ3Jlc3BvbnNlIGZyb20gdmVyaWZ5VXNlclBob25lIGluc2lkZSBoYW5kbGVWZXJpZmljYXRpb25SZXNwb25zZScsXG4gICAgICAgICAgICAgICAgcmVzcG9uc2VcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBjb25zdCBzdGVwID0ge1xuICAgICAgICAgICAgICAgIGNvbmZpcm1hdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgdmVyaWZpY2F0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAocmVzcG9uc2Uub2spIHtcbiAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25TZXNzaW9uID0gcmVzcG9uc2UuZGF0YS5zZXNzaW9uX2lkO1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgaGFuZGxlIGZvcm0gdmlzaWJpbGl0eSBpZiBpdCdzIGhpZGRlblxuICAgICAgICAgICAgICAgIGlmIChjb25maXJtYXRpb25Gb3JtLmNsYXNzTGlzdC5jb250YWlucygnaGlkZGVuJykpIHtcbiAgICAgICAgICAgICAgICAgICAgdmVyaWZpY2F0aW9uRm9ybS5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICAgICAgdmVyaWZpY2F0aW9uRm9ybS5jbGFzc0xpc3QucmVtb3ZlKCd2aXNpYmxlJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpcm1hdGlvbkZvcm0uY2xhc3NMaXN0LmFkZCgndmlzaWJsZScpO1xuICAgICAgICAgICAgICAgICAgICBjb25maXJtYXRpb25Gb3JtLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHN0ZXAuY29uZmlybWF0aW9uID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAvLyBTdGFydCB0aW1lciBmb3IgY29kZSB2ZXJpZmljYXRpb25cbiAgICAgICAgICAgICAgICBjb25zdCB0dGwgPSByZXNwb25zZS5kYXRhLnBob25lX3ZlcmlmaWNhdGlvbl90dGw7XG4gICAgICAgICAgICAgICAgc3RhcnRWZXJpZmljYXRpb25UaW1lcih0dGwsIHN0ZXApO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgICAgICByZXNwb25zZS5jb2RlID09PSAtMjQgJiZcbiAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlLnJlYXNvbiA9PT0gJ3ZlcmlmaWNhdGlvbl9sb2NrZWQnXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IHJlc3RfdGltZSB9ID0gcmVzcG9uc2UubWVzc2FnZTtcbiAgICAgICAgICAgICAgICBzdWJtaXRCdXR0b24uZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHBob25lSW5wdXQuZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHN0ZXAudmVyaWZpY2F0aW9uID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBzdGFydFZlcmlmaWNhdGlvblRpbWVyKHJlc3RfdGltZSwgc3RlcCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgICAgICAgIHJlc3BvbnNlLmNvZGUgPT09IC0yNCAmJlxuICAgICAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2UucmVhc29uID09PVxuICAgICAgICAgICAgICAgICAgICAncGhvbmVfbnVtYmVyX2hhc19iZWVuX2NvbmZpcm1lZF9ieV9hbm90aGVyX3VzZXInXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICBzdWJtaXRCdXR0b24uZGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBzaG93SW5wdXRNZXNzYWdlKFxuICAgICAgICAgICAgICAgICAgICBFUlJPUl9NRVNTQUdFUy5QSE9ORV9DT05GSVJNRURfQllfQU5PVEhFUi5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25Gb3JtLFxuICAgICAgICAgICAgICAgICAgICAnZXJyb3InXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvL1VzZXIgc3RhcnRzIHRvIGNoYW5nZSBwaG9uZSBudW1iZXJcbiAgICAgICAgcGhvbmVJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGUudGFyZ2V0LnZhbHVlO1xuICAgICAgICAgICAgLy8gUmVtb3ZlIGlzLWludmFsaWQgY2xhc3MgaW5pdGlhbGx5XG4gICAgICAgICAgICBwaG9uZUlucHV0LmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWludmFsaWQnKTtcbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIHBob25lIG51bWJlclxuICAgICAgICAgICAgaWYgKCFpc1Bob25lVmFsaWQodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcGhvbmVJbnB1dC5jbGFzc0xpc3QuYWRkKCdpcy1pbnZhbGlkJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlbW92ZUV4aXN0aW5nTWVzc2FnZXModmVyaWZpY2F0aW9uRm9ybSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZS50YXJnZXQudmFsdWUuc2xpY2UoMSkgPT09IHVzZXJQaG9uZU51bWJlcikge1xuICAgICAgICAgICAgICAgIHN1Ym1pdEJ1dHRvbi5pbm5lckhUTUwgPSAn0J/QhtCU0KLQktCV0KDQlNCY0KLQmCc7XG4gICAgICAgICAgICAgICAgc3VibWl0QnV0dG9uLnNldEF0dHJpYnV0ZSgnZGF0YS10cmFuc2xhdGUnLCAnY29uZmlybScpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdWJtaXRCdXR0b24uaW5uZXJIVE1MID0gJ9CX0JHQldCg0JXQk9Ci0JgnO1xuICAgICAgICAgICAgICAgIHN1Ym1pdEJ1dHRvbi5zZXRBdHRyaWJ1dGUoJ2RhdGEtdHJhbnNsYXRlJywgJ3NhdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uZmlybWF0aW9uQ29kZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIFJlbW92ZSBub24tbnVtZXJpYyBjaGFyYWN0ZXJzXG4gICAgICAgICAgICBlLnRhcmdldC52YWx1ZSA9IGUudGFyZ2V0LnZhbHVlLnJlcGxhY2UoL1teMC05XS9nLCAnJyk7XG5cbiAgICAgICAgICAgIC8vIEFkZC9yZW1vdmUgLmlzLWludmFsaWQgY2xhc3MgYmFzZWQgb24gdmFsaWRhdGlvblxuICAgICAgICAgICAgaWYgKGUudGFyZ2V0LnZhbHVlLmxlbmd0aCAhPT0gNSkge1xuICAgICAgICAgICAgICAgIGUudGFyZ2V0LmNsYXNzTGlzdC5hZGQoJ2lzLWludmFsaWQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZS50YXJnZXQuY2xhc3NMaXN0LnJlbW92ZSgnaXMtaW52YWxpZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBVc2VyIHN1Ym1pdHMgdmVyaWZpY2F0aW9uIGZvcm1cbiAgICAgICAgdmVyaWZpY2F0aW9uRm9ybS5hZGRFdmVudExpc3RlbmVyKCdzdWJtaXQnLCBhc3luYyAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgICAgJyVjIEZvcm0gc3VibWl0dGVkJyxcbiAgICAgICAgICAgICAgICAnY29sb3I6ICNmZjAwZmY7IGZvbnQtd2VpZ2h0OiBib2xkJyxcbiAgICAgICAgICAgICAgICBlXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgc3VibWl0QnV0dG9uLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHN1Ym1pdHRlZFBob25lID0gZS50YXJnZXRbMF0udmFsdWU7XG5cbiAgICAgICAgICAgIGlmICghaXNQaG9uZVZhbGlkKHN1Ym1pdHRlZFBob25lKSkge1xuICAgICAgICAgICAgICAgIHNob3dJbnB1dE1lc3NhZ2UoXG4gICAgICAgICAgICAgICAgICAgIEVSUk9SX01FU1NBR0VTLklOVkFMSURfUEhPTkVfRk9STUFULm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvbkZvcm0sXG4gICAgICAgICAgICAgICAgICAgICdlcnJvcidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIHN1Ym1pdEJ1dHRvbi5kaXNhYmxlZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZW1vdmVFeGlzdGluZ01lc3NhZ2VzKHZlcmlmaWNhdGlvbkZvcm0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVzZXJJZCA9IHVzZXIuZGF0YS5hY2NvdW50LmlkO1xuICAgICAgICAgICAgICAgIGNvbnN0IHVzZXJEYXRhID0gbmV3IEZvcm1EYXRhKCk7XG5cbiAgICAgICAgICAgICAgICB1c2VyRGF0YS5hcHBlbmQoJ3Bob25lJywgc3VibWl0dGVkUGhvbmUpO1xuICAgICAgICAgICAgICAgIHVzZXJEYXRhLmFwcGVuZCgndXNlcmlkJywgdXNlcklkKTtcblxuICAgICAgICAgICAgICAgIC8vQ2hhbmdlIHVzZXIgcGhvbmUgbnVtYmVyXG4gICAgICAgICAgICAgICAgaWYgKHN1Ym1pdHRlZFBob25lICE9PSBgKyR7dXNlclBob25lTnVtYmVyfWApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1RSWSBDSEFOR0UgVVNFUiBQSE9ORS0tLVZFUklGIEZPUk0nKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBjaGFuZ2VVc2VyUGhvbmUodXNlckRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5lcnJvciA9PT0gJ25vJyAmJiAhcmVzcG9uc2UuZXJyb3JfY29kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlRXhpc3RpbmdNZXNzYWdlcyh2ZXJpZmljYXRpb25Gb3JtKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdXNlclBob25lTnVtYmVyID0gcmVzcG9uc2UucGhvbmUuc2xpY2UoMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWJtaXRCdXR0b24uaW5uZXJIVE1MID0gJ9Cf0IbQlNCi0JLQldCg0JTQmNCi0JgnO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VibWl0QnV0dG9uLmRpc2FibGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5lcnJvciA9PT0gJ3llcycgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmVycm9yX2NvZGUgPT09ICdhY2NvdW50aW5nX2Vycm9yXzAyJ1xuICAgICAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Ym1pdEJ1dHRvbi5kaXNhYmxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvd0lucHV0TWVzc2FnZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBFUlJPUl9NRVNTQUdFUy5QSE9ORV9BTFJFQURZX1VTRUQubWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25Gb3JtLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdlcnJvcidcbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vVmVyaWZ5IHVzZXIgcGhvbmUgbnVtYmVyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1RSWSBWRVJJRlkgVVNFUiBQSE9ORS0tLVZFUklGIEZPUk0nKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHZlcmlmeVVzZXJQaG9uZShjaWQpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZVZlcmlmaWNhdGlvblJlc3BvbnNlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyByZXNwb25zZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1ZlcmlmaWNhdGlvbiBwcm9jZXNzIGZhaWxlZDonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgc3VibWl0QnV0dG9uLmRpc2FibGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBjb25maXJtYXRpb24gZm9ybSBoYW5kbGVyXG4gICAgICAgIGNvbmZpcm1hdGlvbkZvcm0uYWRkRXZlbnRMaXN0ZW5lcignc3VibWl0JywgYXN5bmMgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbmZpcm1CdXR0b24uZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3N1Ym1pdHRlciBwaG9uZScsIHN1Ym1pdHRlZFBob25lKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdmVyaWZpY2F0aW9uIGhhcyBleHBpcmVkXG4gICAgICAgICAgICBpZiAoY29uZmlybWF0aW9uRm9ybS5kYXRhc2V0LmNvbmZpcm1hdGlvbkV4cGlyZWQgPT09ICd0cnVlJykge1xuICAgICAgICAgICAgICAgIC8vIFJlc2V0IHRoZSBmb3JtIHN0YXRlXG4gICAgICAgICAgICAgICAgY29uZmlybWF0aW9uRm9ybS5kYXRhc2V0LmNvbmZpcm1hdGlvbkV4cGlyZWQgPSAnZmFsc2UnO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvZGVJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb25maXJtYXRpb24tY29kZScpO1xuICAgICAgICAgICAgICAgIGNvZGVJbnB1dC5yZXF1aXJlZCA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIG5ldyB2ZXJpZmljYXRpb25cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVFJZIFZFUklGWSBVU0VSIFBIT05FLS0tQ09ORiBGT1JNJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdmVyaWZ5VXNlclBob25lKGNpZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlVmVyaWZpY2F0aW9uUmVzcG9uc2UocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgcmVzZW5kaW5nIHZlcmlmaWNhdGlvbiBjb2RlOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uZmlybUJ1dHRvbi5kaXNhYmxlZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBjb2RlID0gY29uZmlybWF0aW9uQ29kZUlucHV0LnZhbHVlO1xuXG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSBsZW5ndGggYW5kIG51bWVyaWNcbiAgICAgICAgICAgIGlmICghL15cXGR7NX0kLy50ZXN0KGNvZGUpKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2luc2lkZSB2YWxpZGF0ZSBmbigpIC0tLWNvZGUgaXMgaW52YWxpZCcpO1xuICAgICAgICAgICAgICAgIGNvbmZpcm1hdGlvbkNvZGVJbnB1dC5jbGFzc0xpc3QuYWRkKCdpcy1pbnZhbGlkJyk7XG4gICAgICAgICAgICAgICAgY29uZmlybUJ1dHRvbi5kaXNhYmxlZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdUUlkgQ09ORklSTSBVU0VSIFBIT05FLS0tQ09ORiBGT1JNJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBjb25maXJtVXNlclBob25lKFxuICAgICAgICAgICAgICAgICAgICBjb2RlLFxuICAgICAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25TZXNzaW9uXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5vaykge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuZm9ybV9fd3JhcHBlcicpLnN0eWxlLmRpc3BsYXkgPVxuICAgICAgICAgICAgICAgICAgICAgICAgJ25vbmUnO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIC8vIFVwZGF0ZSBoZWFkZXIgdGV4dCBhbmQgZGF0YS10cmFuc2xhdGVcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc3QgaGVhZGVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmZvcm1fX2hlYWRlcicpO1xuICAgICAgICAgICAgICAgICAgICAvLyBoZWFkZXIudGV4dENvbnRlbnQgPSAn0KLQktCG0Jkg0J3QntCc0JXQoCDQktCV0KDQmNCk0IbQmtCe0JLQkNCd0J4nO1xuICAgICAgICAgICAgICAgICAgICAvLyBoZWFkZXIuc2V0QXR0cmlidXRlKCdkYXRhLXRyYW5zbGF0ZScsICdmb3JtSGVhZGVyU3VjY2VzcycpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIC8vIFVwZGF0ZSBkZXNjcmlwdGlvbiB0ZXh0IGFuZCBkYXRhLXRyYW5zbGF0ZVxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zdCBkZXNjcmlwdGlvbiA9XG4gICAgICAgICAgICAgICAgICAgIC8vICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuZm9ybV9fZGVzY3JpcHRpb24nKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gZGVzY3JpcHRpb24udGV4dENvbnRlbnQgPVxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgJ9CS0LDRiCDQv9C10YDRgdC+0L3QsNC70YzQvdC40Lkg0LHQvtC90YPRgSDQt9Cw0YDQsNGF0L7QstCw0L3QviDQsiDRgNC+0LfQtNGW0LsgXCLQkdC+0L3Rg9GB0LhcIic7XG4gICAgICAgICAgICAgICAgICAgIC8vIGRlc2NyaXB0aW9uLnNldEF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgICdkYXRhLXRyYW5zbGF0ZScsXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAnZm9ybURlc2NyaXB0aW9uU3VjY2VzcydcbiAgICAgICAgICAgICAgICAgICAgLy8gKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc3Qgc3VjY2Vzc0ltYWdlV3JhcHBlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAnLnN1Y2Nlc3NJbWFnZVdyYXBwZXInXG4gICAgICAgICAgICAgICAgICAgIC8vICk7XG4gICAgICAgICAgICAgICAgICAgIC8vIHN1Y2Nlc3NJbWFnZVdyYXBwZXIuY2xhc3NMaXN0LmFkZCgndmlzaWJsZScpO1xuICAgICAgICAgICAgICAgICAgICAvLyBzdWNjZXNzSW1hZ2VXcmFwcGVyLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIC8vIENyZWF0ZSBmaXJzdCBkaXZcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc3QgZmlyc3REaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gZmlyc3REaXYuY2xhc3NOYW1lID0gJ3N1Y2Nlc3NJbWFnZVdyYXBwZXItcHJpemVJbmZvJztcblxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zdCBmaXJzdFNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICAgICAgICAgIC8vIGZpcnN0U3Bhbi50ZXh0Q29udGVudCA9ICfQodCi0KDQkNCl0J7QktCa0JAg0JTQnic7XG4gICAgICAgICAgICAgICAgICAgIC8vIGZpcnN0U3Bhbi5zZXRBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAnZGF0YS10cmFuc2xhdGUnLFxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgJ3ByaXplSW5mb0luc3VyYW5jZSdcbiAgICAgICAgICAgICAgICAgICAgLy8gKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zdCBzZWNvbmRTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgICAgICAgICAvLyBzZWNvbmRTcGFuLnRleHRDb250ZW50ID0gJ9Ch0KLQkNCS0JrQmCAxMDAg4oK0JztcbiAgICAgICAgICAgICAgICAgICAgLy8gc2Vjb25kU3Bhbi5zZXRBdHRyaWJ1dGUoJ2RhdGEtdHJhbnNsYXRlJywgJ3ByaXplSW5mb1ZhbHVlJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gLy8gQXBwZW5kIHNwYW5zIHRvIGZpcnN0IGRpdlxuICAgICAgICAgICAgICAgICAgICAvLyBmaXJzdERpdi5hcHBlbmRDaGlsZChmaXJzdFNwYW4pO1xuICAgICAgICAgICAgICAgICAgICAvLyBmaXJzdERpdi5hcHBlbmRDaGlsZChzZWNvbmRTcGFuKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyAvLyBDcmVhdGUgc2Vjb25kIGRpdlxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zdCBzZWNvbmREaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gc2Vjb25kRGl2LmNsYXNzTmFtZSA9ICdzdWNjZXNzSW1hZ2VXcmFwcGVyLWJvbnVzU3BhcmsnO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIC8vIEFwcGVuZCBkaXZzIHRvIGNvbnRhaW5lclxuICAgICAgICAgICAgICAgICAgICAvLyBzdWNjZXNzSW1hZ2VXcmFwcGVyLmFwcGVuZENoaWxkKGZpcnN0RGl2KTtcbiAgICAgICAgICAgICAgICAgICAgLy8gc3VjY2Vzc0ltYWdlV3JhcHBlci5hcHBlbmRDaGlsZChzZWNvbmREaXYpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGxpbmtCdXR0b25XcmFwcGVyLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnN0IGxpbmtCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgJy5saW5rX19idXR0b24td3JhcHBlciBhJ1xuICAgICAgICAgICAgICAgICAgICAvLyApO1xuICAgICAgICAgICAgICAgICAgICAvLyBsaW5rQnV0dG9uLmhyZWYgPSAnL3BlcnNvbmFsLW9mZmljZS9ib251c2VzL2JldGluc3VyYW5jZSc7XG4gICAgICAgICAgICAgICAgICAgIC8vIGxpbmtCdXR0b24udGV4dENvbnRlbnQgPSAn0JTQniDQkdCe0J3Qo9Ch0KMnO1xuICAgICAgICAgICAgICAgICAgICAvLyBsaW5rQnV0dG9uLnNldEF0dHJpYnV0ZSgnZGF0YS10cmFuc2xhdGUnLCAnY29uZmlybVN1Y2Nlc3MnKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyEgQWRkIHZlcmlmaWNhdGlvbiByZWNvcmRcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdXNlcklkID0gdXNlci5kYXRhLmFjY291bnQuaWQ7XG5cbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgYWRkVmVyaWZpY2F0aW9uKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZXJpZDogdXNlcklkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGhvbmU6IHN1Ym1pdHRlZFBob25lLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGNvbmZpcm1pbmcgY29kZTonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgICAgICBlcnJvci5jb2RlID09PSAtNCAmJlxuICAgICAgICAgICAgICAgICAgICBlcnJvci5tZXNzYWdlLnJlYXNvbiA9PT0gJ3dyb25nX3Nlc3Npb25fb3JfY29uZmlybV9jb2RlJ1xuICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICBzaG93SW5wdXRNZXNzYWdlKFxuICAgICAgICAgICAgICAgICAgICAgICAgRVJST1JfTUVTU0FHRVMuSU5WQUxJRF9DT05GSVJNQVRJT05fQ09ERS5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlybWF0aW9uRm9ybSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdlcnJvcidcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIGNvbmZpcm1CdXR0b24uZGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgbG9hZFRyYW5zbGF0aW9ucygpLnRoZW4oaW5pdCk7XG4gICAgLy8gaW5pdCgpO1xuXG4gICAgY29uc3QgbWFpblBhZ2UgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuZmF2X19wYWdlJyk7XG4gICAgc2V0VGltZW91dCgoKSA9PiBtYWluUGFnZS5jbGFzc0xpc3QuYWRkKCdvdmVyZmxvdycpLCAxMDAwKTtcblxuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIuZGFyay1idG5cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+e1xuICAgICAgICBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC50b2dnbGUoXCJkYXJrXCIpXG4gICAgfSlcbn0pKCk7XG4iXX0=
