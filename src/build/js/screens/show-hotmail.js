$(document).ready(function() {
    var formatType = [];

    function addValue(value) {
        return value ? '|' + value : '';
    }
    // Hotmail
    $('form.formCreateHotmail').submit(function(e) {
        e.preventDefault();

        Swal.fire({
            title: 'Xác nhận mua?',
            text: "Bạn sẽ không thể hủy sau khi đồng ý!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Đồng ý',
            cancelButtonText: 'Hủy',
        }).then((result) => {
            if (result.isConfirmed) {
                var formData = new FormData($(this)[0]);
                var type = $('#typeProduct').val();

                // toastr.info('Đang xử lý...');
                $.ajax({
                    type: "POST",
                    url: $(this).attr("action"),
                    data: formData,
                    cache: false,
                    contentType: false,
                    processData: false,
                    beforeSend: function (xhr) {
                        var html = '<span class="spinner-border me-2" role="status" aria-hidden="true"></span><span class="">Đang xử lý...</span>';
                        $('#submitBuyHotmail').html("").html(html).attr("disabled", true);
                    },
                    success: function(res) {
                        if (res.status) {
                            toastr.success(res.message);
                            var dataHotmail = "";
                            var data = res.data;
                            if (type === 'Default') {
                                res.data.forEach(function (product) {
                                    dataHotmail += product.data + '\n';
                                })

                                $('textarea#dataBuyHotmail').val(dataHotmail);
                                $('.formatEmail').addClass('d-none');
                                $('.buttonCopy').removeClass('col-6').removeClass('col-sm-3').addClass('col-12');
                                let modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('showDataHotmail')) // Returns a Bootstrap modal instance
                                modal.show();
                                $('#submitBuyHotmail').html("").html("Mua hàng").attr("disabled", false);
                                return;
                            }
                            var email = data[0]?.email;
                            var password = data[0]?.password;
                            var access_token = data[0]?.access_token;
                            var refresh_token = data[0]?.refresh_token;
                            var client_id = data[0]?.client_id;
                            var full = data[0]?.full;
                            var email_backup = data[0]?.email_backup;

                            // Format email for after buy
                            if (email && password && access_token && refresh_token && client_id) {
                                formatType = [
                                    {
                                        'full': 'email|password|access_token|refresh_token|client_id'
                                    },
                                    {
                                        'full_2': 'email|password|refresh_token|access_token|client_id'
                                    },
                                    {
                                        'except': 'email|refresh_token|client_id'
                                    },
                                    {
                                        'email_pass_refresh_client': 'email|password|refresh_token|client_id'
                                    }
                                ];
                            }
                            else if (email && password && refresh_token && client_id) {
                                formatType = [
                                    {
                                        'email_pass_refresh_client': 'email|password|refresh_token|client_id'
                                    }
                                ];
                            }
                            else if (email && client_id && refresh_token) {
                                formatType = [
                                    {
                                        'except': 'email|refresh_token|client_id'
                                    }
                                ];
                            }
                            else if (email && password) {
                                formatType = [
                                    {
                                        'default': 'email|password'
                                    }
                                ];
                            }
                            else if (email && password && email_backup) {
                                formatType = [
                                    {
                                        'email_pass_backup': 'email|password|email_backup'
                                    }
                                ];
                            }
                            else {
                                formatType = [
                                    {
                                        'default': 'email|password'
                                    }
                                ];
                            }

                            $('#formatEmailHotmail').empty();
                            formatType.forEach(function(item) {
                                $.each(item, function(key, value) {
                                    $('#formatEmailHotmail').append('<option value="' + key + '">' + value + '</option>');
                                });
                            });

                            let dataOther = [];
                            let modal1 = bootstrap.Modal.getOrCreateInstance(document.getElementById('showDataOther')) // Returns a Bootstrap modal instance
                            if (full !== undefined && full !== null && full !== '') {
                                res.data.forEach(function(product) {
                                    dataOther += product.full + '\n';
                                });

                                $('textarea#dataBuyOther').val(dataOther);
                                modal1.show();
                            } else {
                                res.data.forEach(function(product) {
                                    dataHotmail += product?.email + '|' + product?.password
                                        + addValue(product?.access_token)
                                        + addValue(product?.refresh_token)
                                        + addValue(product?.client_id)
                                        + addValue(product?.email_backup)
                                        + '\n';
                                });

                                let modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('showDataHotmail')) // Returns a Bootstrap modal instance
                                localStorage.removeItem('dataHotmail');
                                localStorage.setItem('dataHotmail', JSON.stringify(res.data));
                                $('textarea#dataBuyHotmail').val(dataHotmail);
                                modal.show();
                            }
                        } else {
                            toastr.error(res.message);
                        }
                        $('#submitBuyHotmail').html("").html("Mua hàng").attr("disabled", false);

                        // $('#showDataHotmail').modal('show');
                    },
                    error: function(xhr, status, error) {
                        if (xhr.status === 401) {
                            toastr.warning('Hãy đăng nhập');
                            // Redirect the user to the login page
                            setTimeout(function() {
                                window.location.href = '/login';
                            }, 500);
                        } else {
                            toastr.error('Đã có lỗi xảy ra');
                        }
                        $('#submitBuyHotmail').html("").html("Mua hàng").attr("disabled", false);
                    }
                });
            }
        });
    });

    $('#showDataHotmail').on('hidden.bs.modal', function (e) {
        $('#formatEmailHotmail').empty();
        $('#dataBuyHotmail').val('');
        localStorage.removeItem('dataHotmail');
    })

    $('#formatEmailHotmail').on('change', function() {
        var data = localStorage.getItem('dataHotmail');
        var formatEmail = $(this).val();
        var dataHotmail = "";
        var dataJson = JSON.parse(data);
        dataJson.forEach(function(product) {
            if (formatEmail === 'full') {
                dataHotmail += product?.email + '|' + product?.password + addValue(product?.access_token) + addValue(product?.refresh_token) + addValue(product?.client_id) + '\n';
            }
            else if (formatEmail === 'full_2') {
                dataHotmail += product?.email + '|' + product?.password + addValue(product?.refresh_token) + addValue(product?.access_token) + addValue(product?.client_id) + '\n';
            }
            else if (formatEmail === 'except') {
                dataHotmail += product?.email + addValue(product?.refresh_token) + addValue(product?.client_id) + '\n';
            }
            else if (formatEmail === 'email_pass_refresh_client') {
                dataHotmail += product?.email + '|' + product?.password + addValue(product?.refresh_token) + addValue(product?.client_id) + '\n';
            }
            else {
                dataHotmail += product?.email + '|' + product?.password + '\n';
            }
        });
        $('textearea#dataBuyHotmail').val('');
        $('textarea#dataBuyHotmail').val(dataHotmail);
    });

    $('form.changeApiToken').submit(function(e) {
        e.preventDefault();

        Swal.fire({
            title: 'Xác nhận thay đổi token?',
            text: "Bạn sẽ không thể hủy sau khi đồng ý!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Đồng ý',
            cancelButtonText: 'Hủy',
        }).then((result) => {
            if (result.isConfirmed) {
                var formData = new FormData($(this)[0]);
                $.ajax({
                    type: "POST",
                    url: $(this).attr("action"),
                    data: formData,
                    cache: false,
                    contentType: false,
                    processData: false,
                    beforeSend: function (xhr) {
                        var html = '<span class="spinner-border me-2" role="status" aria-hidden="true"></span><span class="">Đang xử lý...</span>';
                        $('#btnCreateNewToken').html("").html(html).attr("disabled", true);
                    },
                    success: function(res) {
                        if (res.status) {
                            toastr.success(res.message);
                            $('#apiTokenUser').val(res.data);

                        } else {
                            toastr.error(res.message);
                        }
                        $('#btnCreateNewToken').html("").html("Làm mới token").attr("disabled", false);

                    },
                    error: function(xhr, status, error) {
                        if (xhr.status === 401) {
                            toastr.warning('Hãy đăng nhập');
                            // Redirect the user to the login page
                            setTimeout(function() {
                                window.location.href = '/login';
                            }, 500);
                        } else {
                            toastr.error('Đã có lỗi xảy ra');
                        }
                        $('#btnCreateNewToken').html("").html("Làm mới token").attr("disabled", false);
                    }
                });
            }
        });
    });

    $('.buttonCopyHotmail').click(function() {
        var hotmailContent = $('#dataBuyHotmail');
        hotmailContent.select();
        try {
            var successful = document.execCommand('copy');
            if (successful) {
                toastr.success('Nội dung đã được sao chép');
            } else {
                toastr.error('Không thể sao chép nội dung. Vui lòng thử lại!');
            }
        } catch (err) {
            toastr.error('Không thể sao chép nội dung. Vui lòng thử lại!');
        }
    });

    // $.ajax({
    //     url: '/hotmail/showProduct',
    //     type: 'GET',
    //     success: function(res) {
    //         if (res.status) {
    //             $('#show-product-hotmail').html(res.data)
    //         }
    //
    //     },
    //     error: function(xhr, status, error) {
    //
    //     }
    // });

    $(document).on('click', '#btnBuyHotmail', function() {
        $('#inpProductId').val($(this).data('product_id'));

        var price = Math.round($(this).data('price')); // Round the price to an integer
        $('#inpUnitPrice').val(price); // Set the unit price input to the rounded price
        $('#totalMoney').val(price); // Set the initial total money to the unit price
        $('#staticBackdropLabel').text('Mua ' + $(this).data('product_name'));
        $('#typeProduct').val($(this).data('product_type'));
    });

    $('#quantityHotmail').on('input', function() {
        var quantity = parseFloat($(this).val()) || 0; // Get the current quantity, default to 0 if empty or invalid
        var unitPrice = parseFloat($('#inpUnitPrice').val()) || 0; // Get the unit price, default to 0 if empty or invalid
        var total = (quantity * unitPrice); // Calculate the total and format to two decimal places
        $('#totalMoney').val(total); // Set the total
    });

    // package email
    $.ajax({
        url: '/packages',
        type: 'GET',
        success: function(res) {
            if (res.status) {
                $('#show-package-email').html(res.data)
            }

        },
        error: function(xhr, status, error) {

        }
    });
});






