class BudgetBuddy {
    constructor() {
        this.expenses = [];
        this.budgets = {};
        this.pieChart = null;
        this.barChart = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setDefaultDate();
        this.loadData();
    }

    setupEventListeners() {
        document.getElementById('expenseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addExpense();
        });

        document.getElementById('budgetForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.setBudget();
        });
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
    }

    async loadData() {
        try {
            const [expensesRes, budgetsRes, analyticsRes] = await Promise.all([
                fetch('/api/expenses'),
                fetch('/api/budgets'),
                fetch('/api/analytics')
            ]);

            this.expenses = await expensesRes.json();
            this.budgets = await budgetsRes.json();
            const analytics = await analyticsRes.json();

            this.updateDashboard(analytics);
            this.updateExpensesList();
            this.updateBudgetStatus();
            this.updateCharts(analytics);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async addExpense() {
        const formData = {
            amount: parseFloat(document.getElementById('amount').value),
            category: document.getElementById('category').value,
            description: document.getElementById('description').value,
            date: document.getElementById('date').value
        };

        try {
            const response = await fetch('/api/expenses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            
            if (result.warning) {
                this.showWarning(result.warning);
            }

            document.getElementById('expenseForm').reset();
            this.setDefaultDate();
            this.loadData();
        } catch (error) {
            console.error('Error adding expense:', error);
        }
    }

    async setBudget() {
        const budgetData = {
            category: document.getElementById('budgetCategory').value,
            amount: parseFloat(document.getElementById('budgetAmount').value)
        };

        try {
            const response = await fetch('/api/budgets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(budgetData)
            });

            document.getElementById('budgetForm').reset();
            this.loadData();
        } catch (error) {
            console.error('Error setting budget:', error);
        }
    }

    async deleteExpense(expenseId) {
        try {
            await fetch(`/api/expenses/${expenseId}`, {
                method: 'DELETE'
            });
            this.loadData();
        } catch (error) {
            console.error('Error deleting expense:', error);
        }
    }

    showWarning(message) {
        const warningContainer = document.getElementById('warningContainer');
        const warningMessage = document.getElementById('warningMessage');
        
        warningMessage.textContent = message;
        warningContainer.style.display = 'block';
        
        setTimeout(() => {
            warningContainer.style.display = 'none';
        }, 5000);
    }

    updateDashboard(analytics) {
        document.getElementById('totalSpent').textContent = `$${analytics.total_spent.toFixed(2)}`;
        
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthSpent = analytics.monthly_totals[currentMonth] || 0;
        document.getElementById('monthSpent').textContent = `$${monthSpent.toFixed(2)}`;
        
        document.getElementById('categoryCount').textContent = Object.keys(analytics.category_totals).length;
    }

    updateExpensesList() {
        const expensesList = document.getElementById('expensesList');
        const recentExpenses = this.expenses.slice(-10).reverse();

        if (recentExpenses.length === 0) {
            expensesList.innerHTML = '<p>No expenses yet. Add your first expense!</p>';
            return;
        }

        expensesList.innerHTML = recentExpenses.map(expense => `
            <div class="expense-item">
                <div class="expense-details">
                    <h4>${expense.category}</h4>
                    <p>${expense.description || 'No description'} • ${expense.date}</p>
                </div>
                <div style="display: flex; align-items: center;">
                    <span class="expense-amount">$${expense.amount.toFixed(2)}</span>
                    <button class="delete-btn" onclick="budgetBuddy.deleteExpense(${expense.id})">×</button>
                </div>
            </div>
        `).join('');
    }

    updateBudgetStatus() {
        const budgetStatus = document.getElementById('budgetStatus');
        
        if (Object.keys(this.budgets).length === 0) {
            budgetStatus.innerHTML = '<p>No budgets set yet.</p>';
            return;
        }

        const categoryTotals = {};
        this.expenses.forEach(expense => {
            categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
        });

        budgetStatus.innerHTML = Object.entries(this.budgets).map(([category, budget]) => {
            const spent = categoryTotals[category] || 0;
            const percentage = (spent / budget) * 100;
            const isOverBudget = percentage > 100;

            return `
                <div class="budget-item">
                    <div>
                        <strong>${category}</strong>
                        <div class="budget-progress">
                            <div>$${spent.toFixed(2)} / $${budget.toFixed(2)}</div>
                            <div class="progress-bar">
                                <div class="progress-fill ${isOverBudget ? 'over-budget' : ''}" 
                                     style="width: ${Math.min(percentage, 100)}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateCharts(analytics) {
        this.updatePieChart(analytics.category_totals);
        this.updateBarChart(analytics.monthly_totals);
    }

    updatePieChart(categoryTotals) {
        const ctx = document.getElementById('pieChart').getContext('2d');
        
        if (this.pieChart) {
            this.pieChart.destroy();
        }

        const data = Object.entries(categoryTotals);
        
        if (data.length === 0) {
            return;
        }

        this.pieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.map(([category]) => category),
                datasets: [{
                    data: data.map(([, amount]) => amount),
                    backgroundColor: [
                        '#667eea', '#764ba2', '#f093fb', '#f5576c',
                        '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
                        '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    updateBarChart(monthlyTotals) {
        const ctx = document.getElementById('barChart').getContext('2d');
        
        if (this.barChart) {
            this.barChart.destroy();
        }

        const data = Object.entries(monthlyTotals).sort();
        
        if (data.length === 0) {
            return;
        }

        this.barChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(([month]) => {
                    const date = new Date(month + '-01');
                    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                }),
                datasets: [{
                    label: 'Monthly Spending',
                    data: data.map(([, amount]) => amount),
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    }
}

// Initialize the app
const budgetBuddy = new BudgetBuddy();