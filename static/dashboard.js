// ================================================
// TOAST NOTIFICATIONS
// ================================================
function showToast(type, title, message, duration = 5000) {
    // Check if any modal is open
    const openModal = document.querySelector('.modal[style*="display: flex"], .modal[style*="display:block"]');

    if (openModal) {
        // Show message inside the modal
        const modalId = openModal.id;
        const messageDiv = document.getElementById(`${modalId}-message`);

        if (messageDiv) {
            messageDiv.className = `modal-message modal-message-${type}`;
            messageDiv.textContent = `${title}: ${message}`;
            messageDiv.style.display = 'block';

            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, duration);
            return;
        }
    }

    // Fall back to toast notification
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
    };

    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.success}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="dismissToast(this.parentElement)" aria-label="알림 닫기">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
    `;

    container.appendChild(toast);

    // Auto-dismiss after duration
    setTimeout(() => {
        if (toast.parentElement) {
            dismissToast(toast);
        }
    }, duration);
}

function dismissToast(toast) {
    if (!toast.parentElement) return;
    toast.classList.add('toast-removing');
    toast.addEventListener('animationend', () => {
        if (toast.parentElement) {
            toast.remove();
        }
    });
}

function showSuccess(message, title = '성공') {
    showToast('success', title, message);
}

function showError(message, title = '오류') {
    showToast('error', title, message);
}

function showWarning(message, title = '경고') {
    showToast('warning', title, message);
}

// ================================================
// END TOAST NOTIFICATIONS
// ================================================

// Set current date
document.addEventListener('DOMContentLoaded', function() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date();
    document.getElementById('current-date').textContent = today.toLocaleDateString('ko-KR', options);
});

// Vulnerability: Token stored in localStorage
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    fetchTransactions();

    // Add event listeners
    document.getElementById('transferForm').addEventListener('submit', handleTransfer);
    document.getElementById('loanForm').addEventListener('submit', handleLoanRequest);
    document.getElementById('profileUploadForm').addEventListener('submit', handleProfileUpload);
    const profileUrlBtn = document.getElementById('profileUrlButton');
    if (profileUrlBtn) {
        profileUrlBtn.addEventListener('click', handleProfileUrlImport);
    }

    // Add bio form event listener (Stored XSS vulnerability)
    const bioForm = document.getElementById('bioForm');
    if (bioForm) {
        bioForm.addEventListener('submit', handleBioUpdate);
    }

    // Add virtual cards event listener
    document.getElementById('createCardForm').addEventListener('submit', handleCreateCard);
    document.getElementById('fundCardForm').addEventListener('submit', handleFundCard);
    document.getElementById('card_currency').addEventListener('change', updateCardLimitHelper);
    document.getElementById('fund_amount').addEventListener('input', updateFundingPreview);
    updateCardLimitHelper();
    
    // Load virtual cards
    fetchVirtualCards();

    // Add bill payment functions
    document.getElementById('payBillForm').addEventListener('submit', handleBillPayment);
    
    // Load initial data
    loadBillCategories();
    loadPaymentHistory();

    // Set active nav link based on URL hash
    const hash = window.location.hash || '#profile';
    const activeLink = document.querySelector(`.nav-link[href='${hash}']`);
    if (activeLink) {
        setActiveLink(activeLink);
    }
    
    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
});

// Navigation functions
function setActiveLink(element) {
    // Remove active class from all links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Add active class to clicked link
    element.classList.add('active');
    
    // For mobile view, close the menu
    if (window.innerWidth <= 768) {
        document.querySelector('.side-panel').classList.remove('active');
    }
}

function toggleSidePanel() {
    document.querySelector('.side-panel').classList.toggle('active');
}

function handleScroll() {
    const sections = document.querySelectorAll('.dashboard-section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (pageYOffset >= (sectionTop - 200)) {
            current = '#' + section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === current) {
            link.classList.add('active');
        }
    });
}

// Transfer money handler
async function handleTransfer(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const jsonData = {};
    formData.forEach((value, key) => jsonData[key] = value);

    try {
        const response = await fetch('/transfer', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('jwt_token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(jsonData)
        });

        const data = await response.json();
        if (data.status === 'success') {
            // Update balance
            setMainBalanceValue(data.new_balance);
            showSuccess(data.message, '송금 완료');

            // Refresh transactions
            fetchTransactions();
            
            // Clear form
            event.target.reset();
        } else {
            showError(data.message, '송금 실패');
        }
    } catch (error) {
        showError('송금에 실패했습니다. 다시 시도해 주세요.', '송금 실패');
    }
}

// Loan request handler
async function handleLoanRequest(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const jsonData = {};
    formData.forEach((value, key) => jsonData[key] = value);

    try {
        const response = await fetch('/request_loan', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('jwt_token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(jsonData)
        });

        const data = await response.json();
        if (data.status === 'success') {
            showSuccess('대출 신청이 접수되었습니다. 담당자가 검토 후 승인해 드립니다!', '대출 신청 완료');

            // Check if loans section exists, if not create it
            let loansSection = document.querySelector('.loans-section');
            if (!loansSection) {
                // Create new loans section
                loansSection = document.createElement('div');
                loansSection.className = 'loans-section';
                loansSection.style.marginTop = '2rem';
                loansSection.innerHTML = `
                    <h3 style="margin-bottom: 1rem;">내 대출 신청 내역</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>금액</th>
                                <th>상태</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                `;
                // Add it to the loans section
                document.getElementById('loans').appendChild(loansSection);
            }
            
            // Add new loan to the table
            const loansTableBody = loansSection.querySelector('tbody');
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td>$${jsonData.amount}</td>
                <td><span class="status-pending">pending</span></td>
            `;
            loansTableBody.appendChild(newRow);
            
            // Clear form
            event.target.reset();
        } else {
            showError(data.message, '대출 신청 실패');
        }
    } catch (error) {
        showError('대출 신청에 실패했습니다. 다시 시도해 주세요.', '대출 신청 실패');
    }
}

// Profile picture upload handler
async function handleProfileUpload(event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    try {
        const response = await fetch('/upload_profile_picture', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('jwt_token')
            },
            body: formData
        });

        const data = await response.json();
        if (data.status === 'success') {
            // Vulnerability: No sanitization of file_path
            const img = document.getElementById('profile-picture');
            img.src = '/' + data.file_path + '?v=' + new Date().getTime(); // Prevent caching
            document.getElementById('upload-message').innerText = '업로드되었습니다!';
            document.getElementById('upload-message').style.color = 'green';
            event.target.reset();
        } else {
            document.getElementById('upload-message').innerText = data.message;
            document.getElementById('upload-message').style.color = 'red';
        }
    } catch (error) {
        document.getElementById('upload-message').innerText = '업로드에 실패했습니다';
        document.getElementById('upload-message').style.color = 'red';
    }
}

// Import profile picture from URL (Intentionally Vulnerable to SSRF)
async function handleProfileUrlImport() {
    const imageUrl = prompt('프로필 사진으로 가져올 이미지 URL을 입력하세요:');
    if (!imageUrl) return;

    try {
        const response = await fetch('/upload_profile_picture_url', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('jwt_token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image_url: imageUrl })
        });

        const data = await response.json();
        if (data.status === 'success') {
            const img = document.getElementById('profile-picture');
            img.src = '/' + data.file_path + '?v=' + new Date().getTime();
            document.getElementById('upload-message').innerText = 'URL에서 가져왔습니다!';
            document.getElementById('upload-message').style.color = 'green';
        } else {
            document.getElementById('upload-message').innerText = data.message || '가져오기에 실패했습니다';
            document.getElementById('upload-message').style.color = 'red';
        }
    } catch (error) {
        document.getElementById('upload-message').innerText = '가져오기에 실패했습니다';
        document.getElementById('upload-message').style.color = 'red';
    }
}

// Update user bio (Stored XSS vulnerability - no sanitization on display)
async function handleBioUpdate(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const bio = formData.get('bio');

    try {
        const response = await fetch('/update_bio', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('jwt_token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bio: bio })
        });

        const data = await response.json();
        if (data.status === 'success') {
            // Update the bio display immediately with user input (XSS vulnerability)
            const bioDisplay = document.getElementById('user-bio-display');
            if (bioDisplay) {
                bioDisplay.innerHTML = bio; // Direct innerHTML assignment - XSS!
            }

            document.getElementById('bio-message').innerText = '소개가 수정되었습니다!';
            document.getElementById('bio-message').style.color = 'green';
        } else {
            document.getElementById('bio-message').innerText = data.message || '수정에 실패했습니다';
            document.getElementById('bio-message').style.color = 'red';
        }
    } catch (error) {
        document.getElementById('bio-message').innerText = '수정에 실패했습니다';
        document.getElementById('bio-message').style.color = 'red';
    }
}


// Fetch transactions
// Vulnerability: No rate limiting on transaction fetches
async function fetchTransactions() {
    try {
        const accountNumber = document.getElementById('account-number').textContent;
        const response = await fetch(`/transactions/${accountNumber}`, {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('jwt_token')
            }
        });

        const data = await response.json();
        if (data.status === 'success') {
            if (data.transactions.length === 0) {
                document.getElementById('transaction-list').innerHTML = '<p style="text-align: center; padding: 2rem;">거래 내역이 없습니다</p>';
                return;
            }
            
            // Vulnerability: innerHTML used with unsanitized data
            const transactionHtml = data.transactions.map(t => {
                const isOutgoing = t.from_account === accountNumber;
                const transactionType = isOutgoing ? 'sent' : 'received';
                
                return `
                    <div class="transaction-item ${transactionType}">
                        <div class="transaction-details">
                            <div class="transaction-account">
                                ${isOutgoing ? '받는 분: ' + t.to_account : '보낸 분: ' + t.from_account}
                            </div>
                            <div class="transaction-date">${t.timestamp}</div>
                            ${t.description ? `<div class="transaction-description">${t.description}</div>` : ''}
                        </div>
                        <div class="transaction-amount ${transactionType}">
                            ${isOutgoing ? '-' : '+'}$${Math.abs(t.amount)}
                        </div>
                    </div>
                `;
            }).join('');
            
            document.getElementById('transaction-list').innerHTML = transactionHtml;
        } else {
            document.getElementById('transaction-list').innerHTML = '<p style="text-align: center; padding: 2rem;">거래 내역을 불러오는 중 오류가 발생했습니다</p>';
        }
    } catch (error) {
        document.getElementById('transaction-list').innerHTML = '<p style="text-align: center; padding: 2rem;">거래 내역을 불러오는 중 오류가 발생했습니다</p>';
    }
}

// Virtual Cards Management
let virtualCards = [];

const CARD_CURRENCY_META = {
    USD: { symbol: '$', precision: 2, rate: 1.0 },
    GBP: { symbol: '£', precision: 2, rate: 0.79 },
    NGN: { symbol: 'NGN ', precision: 2, rate: 1550.0 },
    JPY: { symbol: '¥', precision: 2, rate: 149.5 },
    EUR: { symbol: '€', precision: 2, rate: 0.92 },
    QAR: { symbol: 'QAR ', precision: 2, rate: 3.64 },
    BTC: { symbol: 'BTC ', precision: 8, rate: 0.000014 },
    ETH: { symbol: 'ETH ', precision: 8, rate: 0.0004 }
};

function getCardCurrencyMeta(currency) {
    return CARD_CURRENCY_META[String(currency || 'USD').toUpperCase()] || CARD_CURRENCY_META.USD;
}

function getCardInputStep(currency) {
    return getCardCurrencyMeta(currency).precision === 8 ? '0.00000001' : '0.01';
}

function formatCurrencyAmount(amount, currency = 'USD') {
    const numericAmount = Number(amount || 0);
    const meta = getCardCurrencyMeta(currency);
    const minimumFractionDigits = meta.precision === 8 ? 4 : 2;
    return `${meta.symbol}${numericAmount.toLocaleString('en-US', {
        minimumFractionDigits,
        maximumFractionDigits: meta.precision
    })}`;
}

function convertUsdToCardCurrency(amount, currency) {
    return Number(amount || 0) * getCardCurrencyMeta(currency).rate;
}

function getMainBalanceValue() {
    const balanceText = document.getElementById('balance').textContent || '0';
    return parseFloat(balanceText.replace(/[^0-9.-]/g, '')) || 0;
}

function setMainBalanceValue(amount) {
    document.getElementById('balance').textContent = formatCurrencyAmount(amount, 'USD');
}

async function fetchVirtualCards() {
    try {
        const response = await fetch('/api/virtual-cards', {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('jwt_token')
            }
        });

        const data = await response.json();
        if (data.status === 'success') {
            virtualCards = data.cards;
            renderVirtualCards();
        } else {
            document.getElementById('virtual-cards-list').innerHTML = '<div class="cards-empty-state">가상 카드가 없습니다</div>';
        }
    } catch (error) {
        document.getElementById('virtual-cards-list').innerHTML = '<div class="cards-empty-state">가상 카드를 불러오는 중 오류가 발생했습니다</div>';
    }
}

function renderVirtualCards() {
    const container = document.getElementById('virtual-cards-list');
    if (virtualCards.length === 0) {
        container.innerHTML = '<div class="cards-empty-state">가상 카드가 없습니다. 새 카드를 만들어 시작해 보세요.</div>';
        return;
    }
    
    // Vulnerability: XSS possible in card rendering
    container.innerHTML = virtualCards.map(card => `
        <div class="virtual-card ${String(card.card_type || '').toLowerCase()} ${card.is_frozen ? 'frozen' : ''}" id="card-${card.id}">
            <div class="card-topline">
                <div class="card-type">${card.card_type.toUpperCase()}</div>
                <div class="card-currency-badge">${card.currency || 'USD'}</div>
            </div>
            <div class="card-number">${formatCardNumber(card.card_number)}</div>
            <div class="card-details">
                <div>유효기간: ${card.expiry_date}</div>
                <div>CVV: ${card.cvv}</div>
            </div>
            <div class="card-balance-lines">
                <div><span>한도</span>${formatCurrencyAmount(card.limit, card.currency)}</div>
                <div><span>잔액</span>${formatCurrencyAmount(card.balance, card.currency)}</div>
            </div>
            <div class="card-actions">
                <button onclick="showFundCardModal(${card.id})">충전</button>
                <button onclick="toggleCardFreeze(${card.id})">${card.is_frozen ? '동결 해제' : '동결'}</button>
                <button onclick="showCardDetails(${card.id})">상세</button>
                <button onclick="showTransactionHistory(${card.id})">내역</button>
                <button onclick="showUpdateLimit(${card.id})">한도 변경</button>
            </div>
        </div>
    `).join('');
}

function formatCardNumber(number) {
    return number.match(/.{1,4}/g).join(' ');
}

function showCreateCardModal() {
    document.getElementById('createCardModal').style.display = 'flex';
    updateCardLimitHelper();
}

function hideCreateCardModal() {
    document.getElementById('createCardModal').style.display = 'none';
    document.getElementById('createCardForm').reset();
    updateCardLimitHelper();
}

function showCardDetails(cardId) {
    const card = virtualCards.find(c => c.id === cardId);
    if (!card) return;

    const modal = document.getElementById('cardDetailsModal');
    const content = document.getElementById('cardDetailsContent');
    
    content.innerHTML = `
        <div class="form-group">
            <label>카드 번호</label>
            <p>${formatCardNumber(card.card_number)}</p>
        </div>
        <div class="form-group">
            <label>CVV</label>
            <p>${card.cvv}</p>
        </div>
        <div class="form-group">
            <label>유효기간</label>
            <p>${card.expiry_date}</p>
        </div>
        <div class="form-group">
            <label>카드 종류</label>
            <p>${card.card_type}</p>
        </div>
        <div class="form-group">
            <label>통화</label>
            <p>${card.currency || 'USD'}</p>
        </div>
        <div class="form-group">
            <label>현재 한도</label>
            <p>${formatCurrencyAmount(card.limit, card.currency)}</p>
        </div>
        <div class="form-group">
            <label>현재 잔액</label>
            <p>${formatCurrencyAmount(card.balance, card.currency)}</p>
        </div>
        <div class="form-group">
            <label>상태</label>
            <p>${card.is_frozen ? '동결됨' : '사용 중'}</p>
        </div>
        <div class="form-group">
            <label>생성일</label>
            <p>${new Date(card.created_at).toLocaleDateString()}</p>
        </div>
    `;
    
    modal.style.display = 'flex';
}

function hideCardDetailsModal() {
    document.getElementById('cardDetailsModal').style.display = 'none';
}

function updateCardLimitHelper() {
    const currency = document.getElementById('card_currency').value || 'USD';
    const helper = document.getElementById('cardLimitHelper');
    const limitInput = document.getElementById('card_limit');
    helper.textContent = `한도는 ${currency} 기준으로 저장됩니다. 충전 금액은 여전히 USD 주 계좌 잔액에서 출금됩니다.`;
    limitInput.step = getCardInputStep(currency);
}

async function handleCreateCard(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const jsonData = {};
    formData.forEach((value, key) => jsonData[key] = value);

    try {
        const response = await fetch('/api/virtual-cards/create', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('jwt_token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(jsonData)
        });

        const data = await response.json();
        if (data.status === 'success') {
            hideCreateCardModal();
            await fetchVirtualCards();

            showSuccess('가상 카드가 만들어졌습니다!', '카드 생성 완료');
        } else {
            showError(data.message, '카드 생성 실패');
        }
    } catch (error) {
        showError('가상 카드를 만들지 못했습니다. 다시 시도해 주세요.', '카드 생성 실패');
    }
}

function showFundCardModal(cardId) {
    const card = virtualCards.find(c => c.id === cardId);
    if (!card) return;

    const modal = document.getElementById('fundCardModal');
    modal.dataset.currency = card.currency || 'USD';
    modal.dataset.cardId = String(cardId);
    document.getElementById('fund_card_id').value = cardId;
    document.getElementById('fund_amount').value = '';
    document.getElementById('fundCardSummary').textContent =
        `${(card.currency || 'USD')} ${card.card_type} 카드 (끝자리 ${card.card_number.slice(-4)}) | ` +
        `잔액 ${formatCurrencyAmount(card.balance, card.currency)} | 한도 ${formatCurrencyAmount(card.limit, card.currency)}`;
    updateFundingPreview();
    modal.style.display = 'flex';
}

function hideFundCardModal() {
    const modal = document.getElementById('fundCardModal');
    modal.style.display = 'none';
    modal.dataset.currency = 'USD';
    modal.dataset.cardId = '';
    document.getElementById('fundCardForm').reset();
    document.getElementById('fundingPreview').textContent = 'USD 금액을 입력하면 카드 통화로 환산된 금액을 미리 볼 수 있습니다.';
}

function updateFundingPreview() {
    const modal = document.getElementById('fundCardModal');
    const currency = modal.dataset.currency || 'USD';
    const usdAmount = parseFloat(document.getElementById('fund_amount').value) || 0;
    const preview = document.getElementById('fundingPreview');

    if (usdAmount <= 0) {
        preview.textContent = 'USD 금액을 입력하면 카드 통화로 환산된 금액을 미리 볼 수 있습니다.';
        return;
    }

    const convertedAmount = convertUsdToCardCurrency(usdAmount, currency);
    preview.textContent =
        `주 계좌 잔액 ${formatCurrencyAmount(usdAmount, 'USD')}은(는) ` +
        `이 ${currency} 카드에서 ${formatCurrencyAmount(convertedAmount, currency)}(으)로 환산됩니다.`;
}

async function handleFundCard(event) {
    event.preventDefault();
    const cardId = document.getElementById('fund_card_id').value;
    const usdAmount = parseFloat(document.getElementById('fund_amount').value);

    try {
        const response = await fetch(`/api/virtual-cards/${cardId}/fund`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('jwt_token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount: usdAmount })
        });

        const data = await response.json();
        if (data.status === 'success') {
            hideFundCardModal();
            setMainBalanceValue(data.funding.main_balance_after);
            await fetchVirtualCards();
            await fetchTransactions();
            showSuccess(
                `${formatCurrencyAmount(data.funding.usd_amount, 'USD')}에서 ${formatCurrencyAmount(data.funding.converted_amount, data.funding.card_currency)}이(가) 카드에 충전되었습니다.`,
                '카드 충전 완료'
            );
        } else {
            showError(data.message, '충전 실패');
        }
    } catch (error) {
        showError('가상 카드를 충전하지 못했습니다. 다시 시도해 주세요.', '충전 실패');
    }
}

async function toggleCardFreeze(cardId) {
    try {
        const response = await fetch(`/api/virtual-cards/${cardId}/toggle-freeze`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('jwt_token')
            }
        });

        const data = await response.json();
        if (data.status === 'success') {
            await fetchVirtualCards();
        } else {
            showError(data.message, '작업 실패');
        }
    } catch (error) {
        showError('카드 동결/해제에 실패했습니다. 다시 시도해 주세요.', '작업 실패');
    }
}

async function showTransactionHistory(cardId) {
    try {
        const response = await fetch(`/api/virtual-cards/${cardId}/transactions`, {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('jwt_token')
            }
        });

        const data = await response.json();
        if (data.status === 'success') {
            const modal = document.getElementById('cardDetailsModal');
            const content = document.getElementById('cardDetailsContent');
            
            if (data.transactions.length === 0) {
                content.innerHTML = '<p style="text-align: center; padding: 1rem;">이 카드의 거래 내역이 없습니다</p>';
                modal.style.display = 'flex';
                return;
            }
            
            content.innerHTML = `
                <h4>거래 내역</h4>
                <div class="transaction-list">
                    ${data.transactions.map(t => `
                        <div class="transaction-item">
                            <div class="transaction-details">
                                <div class="transaction-account">${t.merchant}</div>
                                <div class="transaction-date">${new Date(t.timestamp).toLocaleString()}</div>
                            </div>
                            <div class="transaction-amount">${formatCurrencyAmount(t.amount, t.currency)}</div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            modal.style.display = 'flex';
        } else {
            showError(data.message, '내역 불러오기 실패');
        }
    } catch (error) {
        showError('거래 내역을 불러오지 못했습니다. 다시 시도해 주세요.', '내역 불러오기 실패');
    }
}

async function showUpdateLimit(cardId) {
    const card = virtualCards.find(c => c.id === cardId);
    if (!card) return;

    const modal = document.getElementById('cardDetailsModal');
    const content = document.getElementById('cardDetailsContent');
    
    // Vulnerability: Exposing form that allows updating any field
    content.innerHTML = `
        <h4>카드 한도 변경</h4>
        <form id="updateCardForm" onsubmit="return handleCardUpdate(event, ${cardId})">
            <div class="form-group">
                <label for="card_limit_update">카드 한도 (${card.currency || 'USD'})</label>
                <input type="number" id="card_limit_update" name="card_limit" value="${card.limit}" step="${getCardInputStep(card.currency)}" required>
            </div>
            <div class="modal-footer">
                <button type="submit">한도 변경</button>
                <button type="button" onclick="hideCardDetailsModal()">취소</button>
            </div>
        </form>
    `;
    
    modal.style.display = 'flex';
}

// Add handleCardUpdate function
async function handleCardUpdate(event, cardId) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    // Only send card_limit from UI
    const jsonData = {
        card_limit: parseFloat(formData.get('card_limit'))
    };

    try {
        // Vulnerability: Sending all form data including sensitive fields
        const response = await fetch(`/api/virtual-cards/${cardId}/update-limit`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('jwt_token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(jsonData)
        });

        const data = await response.json();
        if (data.status === 'success') {
            await fetchVirtualCards();
            hideCardDetailsModal();
            showSuccess('카드 한도가 변경되었습니다', '한도 변경 완료');
        } else {
            showError(data.message, '변경 실패');
        }
    } catch (error) {
        showError('카드 한도 변경 중 오류가 발생했습니다. 다시 시도해 주세요.', '변경 실패');
    }

    return false; // Prevent form submission
}

// Bill Payments Functions
function showPayBillModal() {
    document.getElementById('payBillModal').style.display = 'flex';
}

function hidePayBillModal() {
    document.getElementById('payBillModal').style.display = 'none';
    document.getElementById('payBillForm').reset();
    document.getElementById('biller').disabled = true;
    document.getElementById('cardSelection').style.display = 'none';
}

// Load bill categories
async function loadBillCategories() {
    try {
        const response = await fetch('/api/bill-categories');
        const data = await response.json();
        
        if (data.status === 'success') {
            const select = document.getElementById('billCategory');
            // Vulnerability: XSS possible in category name and description
            select.innerHTML = `
                <option value="">분류 선택</option>
                ${data.categories.map(cat => `
                    <option value="${cat.id}">${cat.name}</option>
                `).join('')}
            `;
        }
    } catch (error) {
        console.error('Error loading bill categories:', error);
    }
}

// Load billers for selected category
async function loadBillers(categoryId) {
    if (!categoryId) {
        const select = document.getElementById('biller');
        select.innerHTML = '<option value="">납부처 선택</option>';
        select.disabled = true;
        return;
    }
    
    try {
        const response = await fetch(`/api/billers/by-category/${categoryId}`);
        const data = await response.json();
        
        const select = document.getElementById('biller');
        if (data.status === 'success') {
            // Create a Map to store unique billers by name
            const billerMap = new Map();
            
            // Only keep the first occurrence of each biller name
            data.billers.forEach(biller => {
                if (!billerMap.has(biller.name)) {
                    billerMap.set(biller.name, biller);
                }
            });

            // Convert Map values back to array
            const uniqueBillers = Array.from(billerMap.values());

            // Sort billers by name for consistency
            uniqueBillers.sort((a, b) => a.name.localeCompare(b.name));

            select.innerHTML = `
                <option value="">납부처 선택</option>
                ${uniqueBillers.map(biller => `
                    <option value="${biller.id}" 
                            data-min="${biller.minimum_amount}"
                            data-max="${biller.maximum_amount || ''}"
                    >${biller.name}</option>
                `).join('')}
            `;
            select.disabled = false;
        } else {
            select.innerHTML = '<option value="">이용 가능한 납부처가 없습니다</option>';
            select.disabled = true;
        }
    } catch (error) {
        console.error('Error loading billers:', error);
        const select = document.getElementById('biller');
        select.innerHTML = '<option value="">납부처를 불러오는 중 오류가 발생했습니다</option>';
        select.disabled = true;
    }
}

// Toggle card selection based on payment method
function toggleCardSelection(method) {
    const cardSelection = document.getElementById('cardSelection');
    if (method === 'virtual_card') {
        cardSelection.style.display = 'block';
        loadVirtualCardsForPayment();  // Load the cards
    } else {
        cardSelection.style.display = 'none';
    }
}

// Function to load virtual cards for payment selection
async function loadVirtualCardsForPayment() {
    try {
        const response = await fetch('/api/virtual-cards', {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('jwt_token')
            }
        });

        const data = await response.json();
        if (data.status === 'success') {
            const select = document.querySelector('select[name="card_id"]');
            // Only show non-frozen cards with available balance
            select.innerHTML = `
                <option value="">카드 선택</option>
                ${data.cards.filter(card => !card.is_frozen).map(card => `
                    <option value="${card.id}">
                        끝자리 ${card.card_number.slice(-4)} 카드 
                        (${card.currency}: ${formatCurrencyAmount(card.balance, card.currency)})
                    </option>
                `).join('')}
            `;
        }
    } catch (error) {
        console.error('Error loading virtual cards:', error);
    }
}

// Handle bill payment submission
async function handleBillPayment(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const jsonData = {
        biller_id: parseInt(formData.get('biller_id')),
        amount: parseFloat(formData.get('amount')),
        payment_method: formData.get('payment_method'),
        description: formData.get('description') || '공과금 납부'
    };
    
    if (jsonData.payment_method === 'virtual_card') {
        jsonData.card_id = parseInt(formData.get('card_id'));
    }

    try {
        const response = await fetch('/api/bill-payments/create', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('jwt_token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(jsonData)
        });

        const data = await response.json();
        if (data.status === 'success') {
            hidePayBillModal();
            showSuccess('공과금이 납부되었습니다!', '납부 완료');
            await loadPaymentHistory();
            await fetchTransactions();

            // Refresh balances if necessary
            if (jsonData.payment_method === 'virtual_card') {
                await fetchVirtualCards();
            } else {
                // Update account balance
                setMainBalanceValue(getMainBalanceValue() - jsonData.amount);
            }
        } else {
            showError(data.message, '납부 실패');
        }
    } catch (error) {
        showError('납부에 실패했습니다. 다시 시도해 주세요.', '납부 실패');
    }
}

// Load payment history
async function loadPaymentHistory() {
    try {
        const response = await fetch('/api/bill-payments/history', {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('jwt_token')
            }
        });

        const data = await response.json();
        if (data.status === 'success') {
            const container = document.getElementById('bill-payments-list');
            if (data.payments.length === 0) {
                container.innerHTML = '<p style="text-align: center; padding: 2rem;">납부 내역이 없습니다</p>';
                return;
            }

            // Vulnerability: XSS possible in payment details
            container.innerHTML = data.payments.map(payment => `
                <div class="payment-item">
                    <div class="payment-header">
                        <div class="payment-amount">$${payment.amount}</div>
                        <div class="payment-status">${payment.status}</div>
                    </div>
                    <div class="payment-details">
                        <div>납부처: ${payment.biller_name}</div>
                        <div>분류: ${payment.category_name}</div>
                        <div>결제 수단: ${payment.payment_method}
                            ${payment.card_number ? ` (끝자리 ${payment.card_number.slice(-4)} 카드)` : ''}
                        </div>
                        <div>참조번호: ${payment.reference}</div>
                        <div>일시: ${new Date(payment.created_at).toLocaleString()}</div>
                        ${payment.description ? `<div>메모: ${payment.description}</div>` : ''}
                    </div>
                </div>
            `).join('');
        } else {
            document.getElementById('bill-payments-list').innerHTML = '<p style="text-align: center; padding: 2rem;">납부 내역을 불러오는 중 오류가 발생했습니다</p>';
        }
    } catch (error) {
        document.getElementById('bill-payments-list').innerHTML = '<p style="text-align: center; padding: 2rem;">납부 내역을 불러오는 중 오류가 발생했습니다</p>';
    }
}

// Vulnerability: No server-side token invalidation
function logout() {
    localStorage.removeItem('jwt_token');
    window.location.href = '/login';
}


// ===== CUSTOMER SUPPORT CHAT FUNCTIONALITY =====

let chatOpen = false;
let chatHistory = [];

// Initialize chat widget
document.addEventListener('DOMContentLoaded', function() {
    // Set initial time for welcome message
    document.getElementById('initialTime').textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    // Add enter key listener for chat input
    document.getElementById('chatMessageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
});

function toggleChat() {
    const chatWindow = document.getElementById('chatWindow');
    const chatBadge = document.getElementById('chatBadge');
    const chatWidget = document.getElementById('chatWidget');
    
    if (chatOpen) {
        // Close chat
        chatWindow.classList.add('closing');
        chatWidget.classList.remove('chat-open');
        setTimeout(() => {
            chatWindow.style.display = 'none';
            chatWindow.classList.remove('closing');
        }, 300);
        chatOpen = false;
    } else {
        // Open chat
        chatWindow.style.display = 'flex';
        chatWindow.classList.add('opening');
        chatWidget.classList.add('chat-open');
        setTimeout(() => {
            chatWindow.classList.remove('opening');
        }, 300);
        chatOpen = true;
        
        // Hide notification badge
        chatBadge.style.display = 'none';
        
        // Focus input
        setTimeout(() => {
            document.getElementById('chatMessageInput').focus();
        }, 300);
    }
}

function sendChatMessage() {
    const input = document.getElementById('chatMessageInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Check for special commands
    if (message.toLowerCase() === '/status' || message.toLowerCase() === '/rate-limit') {
        // Add user message to chat
        addMessageToChat(message, true);
        
        // Clear input
        input.value = '';
        
        // Show typing indicator briefly
        const typingIndicator = document.getElementById('typingIndicator');
        typingIndicator.style.display = 'flex';
        
        setTimeout(() => {
            typingIndicator.style.display = 'none';
            checkRateLimitStatus();
        }, 500);
        
        return;
    }
    
    if (message.toLowerCase() === '/help' || message.toLowerCase() === '/commands') {
        // Add user message to chat
        addMessageToChat(message, true);
        
        // Clear input
        input.value = '';
        
        const helpMessage = `🤖 **사용 가능한 명령어:**\n\n` +
            `• **/help** - 이 도움말 표시\n` +
            `• **/status** 또는 **/rate-limit** - 현재 요청 한도 상태 확인\n` +
            `• **모드 전환** - 위의 라디오 버튼으로 익명 모드와 로그인 모드를 전환할 수 있습니다\n\n` +
            `**요청 한도:**\n` +
            `• 익명 모드: 3시간당 5회\n` +
            `• 로그인 모드: 3시간당 10회\n\n` +
            `질문을 입력하면 AI 도우미와 대화할 수 있습니다!`;
        
        setTimeout(() => {
            addMessageToChat(helpMessage, false);
        }, 300);
        
        return;
    }
    
    // Add user message to chat
    addMessageToChat(message, true);
    
    // Clear input
    input.value = '';
    
    // Disable send button and show typing indicator
    const sendBtn = document.getElementById('sendChatBtn');
    const typingIndicator = document.getElementById('typingIndicator');
    
    sendBtn.disabled = true;
    typingIndicator.style.display = 'flex';
    
    // Send message to AI
    sendToAI(message);
}

function addMessageToChat(message, isUser = false, timestamp = null) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageTime = timestamp || new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            ${isUser ? 
                `<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>` :
                `<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z"/>
                </svg>`
            }
        </div>
        <div class="message-content">
            <div class="message-text">${escapeHtml(message)}</div>
            <div class="message-time">${messageTime}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function sendToAI(message) {
    try {
        // Get selected chat mode
        const selectedMode = document.querySelector('input[name="chatMode"]:checked').value;
        const token = localStorage.getItem('jwt_token');
        
        // Determine endpoint and headers based on mode
        let endpoint, headers;
        
        if (selectedMode === 'authenticated') {
            endpoint = '/api/ai/chat';
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };
        } else {
            endpoint = '/api/ai/chat/anonymous';
            headers = {
                'Content-Type': 'application/json'
            };
        }
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ message: message })
        });
        
        const data = await response.json();
        
        // Hide typing indicator
        document.getElementById('typingIndicator').style.display = 'none';
        
        // Re-enable send button
        document.getElementById('sendChatBtn').disabled = false;
        
        if (response.status === 429) {
            // Handle rate limiting specifically
            const rateLimitInfo = data.rate_limit_info || {};
            const limitType = rateLimitInfo.limit_type || 'unknown';
            const currentCount = rateLimitInfo.current_count || 'unknown';
            const limit = rateLimitInfo.limit || 'unknown';
            const windowHours = rateLimitInfo.window_hours || 3;
            
            let rateLimitMessage = `🚫 **요청 한도 초과**\n\n`;
            
            if (limitType === 'unauthenticated_ip') {
                rateLimitMessage += `익명 사용자 한도에 도달했습니다: 최근 ${windowHours}시간 동안 **${currentCount}/${limit}회 요청**.\n\n`;
                rateLimitMessage += `💡 **팁**: 로그인하면 더 높은 한도(3시간당 10회)를 이용할 수 있습니다`;
            } else if (limitType === 'authenticated_user') {
                rateLimitMessage += `사용자 한도에 도달했습니다: 최근 ${windowHours}시간 동안 **${currentCount}/${limit}회 요청**.\n\n`;
                rateLimitMessage += `잠시 후 다시 메시지를 보내 주세요.`;
            } else if (limitType === 'authenticated_ip') {
                rateLimitMessage += `IP 주소 한도에 도달했습니다: 최근 ${windowHours}시간 동안 **${currentCount}/${limit}회 요청**.\n\n`;
                rateLimitMessage += `잠시 후 다시 메시지를 보내 주세요.`;
            } else {
                rateLimitMessage += `${data.message || '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'}\n\n`;
                rateLimitMessage += `채팅 옵션에서 요청 한도 상태를 확인할 수 있습니다.`;
            }
            
            setTimeout(() => {
                addMessageToChat(rateLimitMessage, false);
            }, 500);
            
        } else if (data.status === 'success') {
            const aiResponse = data.ai_response.response || '죄송합니다. 요청을 처리하지 못했습니다.';
            
            // Add mode indicator to response for debugging
            let responseWithMode = aiResponse;
            if (selectedMode === 'anonymous') {
                responseWithMode += '\n\n🔓 (익명 모드 - 사용자 정보 없음)';
            } else {
                responseWithMode += '\n\n🔐 (로그인 모드 - 사용자 정보 포함)';
            }
            
            // Add AI response with slight delay for realism
            setTimeout(() => {
                addMessageToChat(responseWithMode, false);
            }, 500);
            
        } else {
            // Handle other API errors (400, 401, 500, etc.)
            let errorMsg = '죄송합니다. 기술적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
            
            if (response.status === 401) {
                errorMsg = '🔐 **인증 오류**\n\n세션이 만료되었습니다. 다시 로그인하거나 익명 모드로 전환해 주세요.';
            } else if (response.status === 400) {
                errorMsg = '❌ **잘못된 요청**\n\n' + (data.message || '메시지를 확인한 뒤 다시 시도해 주세요.');
            } else if (response.status === 500) {
                errorMsg = '🔧 **서버 오류**\n\nAI 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.';
            } else if (data.message) {
                // Use the specific error message from the server
                errorMsg = '⚠️ **오류**\n\n' + data.message;
            }
            
            setTimeout(() => {
                addMessageToChat(errorMsg, false);
            }, 500);
        }
        
    } catch (error) {
        console.error('Chat error:', error);
        
        // Hide typing indicator
        document.getElementById('typingIndicator').style.display = 'none';
        
        // Re-enable send button
        document.getElementById('sendChatBtn').disabled = false;
        
        // Show error message with mode awareness
        const selectedMode = document.querySelector('input[name="chatMode"]:checked').value;
        let errorMsg = '현재 연결할 수 없습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.';
        
        if (selectedMode === 'authenticated' && error.message && error.message.includes('token')) {
            errorMsg = '인증에 실패했습니다. 다시 로그인하거나 익명 모드로 전환해 주세요.';
        }
        
        setTimeout(() => {
            addMessageToChat(errorMsg, false);
        }, 500);
    }
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Function to check current rate limit status
async function checkRateLimitStatus() {
    try {
        const token = localStorage.getItem('jwt_token');
        const headers = {};
        
        // Include auth header if available for more detailed status
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch('/api/ai/rate-limit-status', {
            headers: headers
        });
        
        if (response.ok) {
            const data = await response.json();
            const unauth = data.rate_limits.unauthenticated;
            const auth = data.rate_limits.authenticated;
            
            let statusMessage = `📊 **현재 요청 한도 상태**\n\n`;
            statusMessage += `**익명 모드:**\n`;
            statusMessage += `${unauth.requests_made}/${unauth.limit}회 사용 (${unauth.remaining || 0}회 남음)\n\n`;
            
            if (data.authenticated_user) {
                statusMessage += `**로그인 모드 (${data.authenticated_user.username}):**\n`;
                statusMessage += `사용자: ${auth.user_requests_made}/${auth.limit}회 사용 (${auth.user_remaining || 0}회 남음)\n`;
                statusMessage += `IP: ${auth.ip_requests_made}/${auth.limit}회 사용 (${auth.ip_remaining || 0}회 남음)\n\n`;
            } else {
                statusMessage += `**로그인 모드:**\n`;
                statusMessage += `로그인하면 로그인 모드 요청 한도를 확인할 수 있습니다\n\n`;
            }
            
            statusMessage += `요청 한도는 ${unauth.window_hours}시간마다 초기화됩니다.`;
            
            addMessageToChat(statusMessage, false);
        } else {
            addMessageToChat('❌ 요청 한도 상태를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.', false);
        }
    } catch (error) {
        console.error('Error checking rate limit status:', error);
        addMessageToChat('❌ 요청 한도 상태 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', false);
    }
}

// Show notification badge when chat is closed (simulate new messages)
function showChatNotification() {
    if (!chatOpen) {
        const chatBadge = document.getElementById('chatBadge');
        chatBadge.style.display = 'flex';
    }
}

// Optional: Add some sample interactions for demo
function addWelcomeMessage() {
    if (chatHistory.length === 0) {
        const welcomeMsg = `안녕하세요! 저는 AI 뱅킹 도우미입니다. 무엇을 도와드릴까요?\n\n` +
            `💡 **간단한 팁:**\n` +
            `• **/help** 를 입력하면 사용 가능한 명령어를 볼 수 있습니다\n` +
            `• **/status** 를 입력하면 요청 한도를 확인할 수 있습니다\n` +
            `• 위에서 익명 모드(3시간당 5회)와 로그인 모드(3시간당 10회)를 전환할 수 있습니다\n\n` +
            `계좌, 거래 내역 등 뱅킹에 관한 무엇이든 물어보세요!`;
        
        chatHistory.push({
            message: welcomeMsg,
            isUser: false,
            timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        });
    }
}
