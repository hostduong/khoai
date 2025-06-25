$(function (){
    $("#password-addon").on('click', function () {
        if ($(this).siblings('input').length > 0) {
            if ($(this).siblings('input').attr('type') == "input") {
                $(this).siblings('input').attr('type', 'password');
                $(this).find('i').removeClass('fa-eye-slash').addClass('fa-eye');
            } else {
                $(this).siblings('input').attr('type', 'input');
                $(this).find('i').removeClass('fa-eye').addClass('fa-eye-slash');
            }
        }
    });

    const toggler = document.querySelectorAll('.form-password-toggle i')
    if (typeof toggler !== 'undefined' && toggler !== null) {
        toggler.forEach(el => {
            el.addEventListener('click', e => {
                e.preventDefault()
                const formPasswordToggle = el.closest('.form-password-toggle')
                const formPasswordToggleIcon = formPasswordToggle.querySelector('i')
                const formPasswordToggleInput = formPasswordToggle.querySelector('input')

                if (formPasswordToggleInput.getAttribute('type') === 'text') {
                    formPasswordToggleInput.setAttribute('type', 'password')
                    formPasswordToggleIcon.classList.replace('ti-eye', 'ti-eye-off')
                } else if (formPasswordToggleInput.getAttribute('type') === 'password') {
                    formPasswordToggleInput.setAttribute('type', 'text')
                    formPasswordToggleIcon.classList.replace('ti-eye-off', 'ti-eye')
                }
            })
        })
    }
});
