from flask import Flask, request, jsonify, render_template
from datetime import datetime
import json

app = Flask(__name__)

# In-memory storage (in production, use a database)
expenses = []
budgets = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/expenses', methods=['GET', 'POST'])
def handle_expenses():
    if request.method == 'POST':
        data = request.json
        expense = {
            'id': len(expenses) + 1,
            'amount': float(data['amount']),
            'category': data['category'],
            'description': data.get('description', ''),
            'date': data.get('date', datetime.now().strftime('%Y-%m-%d')),
            'timestamp': datetime.now().isoformat()
        }
        expenses.append(expense)
        
        # Check budget limit
        category_total = sum(e['amount'] for e in expenses if e['category'] == expense['category'])
        budget_limit = budgets.get(expense['category'], 0)
        
        warning = None
        if budget_limit > 0 and category_total > budget_limit:
            warning = f"Budget exceeded for {expense['category']}! Spent: ${category_total:.2f}, Budget: ${budget_limit:.2f}"
        
        return jsonify({'expense': expense, 'warning': warning})
    
    return jsonify(expenses)

@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    global expenses
    expenses = [e for e in expenses if e['id'] != expense_id]
    return jsonify({'success': True})

@app.route('/api/budgets', methods=['GET', 'POST'])
def handle_budgets():
    if request.method == 'POST':
        data = request.json
        budgets[data['category']] = float(data['amount'])
        return jsonify({'success': True, 'budgets': budgets})
    
    return jsonify(budgets)

@app.route('/api/analytics')
def analytics():
    if not expenses:
        return jsonify({
            'category_totals': {},
            'monthly_totals': {},
            'total_spent': 0
        })
    
    # Category totals
    category_totals = {}
    for expense in expenses:
        category = expense['category']
        category_totals[category] = category_totals.get(category, 0) + expense['amount']
    
    # Monthly totals
    monthly_totals = {}
    for expense in expenses:
        month = expense['date'][:7]  # YYYY-MM
        monthly_totals[month] = monthly_totals.get(month, 0) + expense['amount']
    
    total_spent = sum(expense['amount'] for expense in expenses)
    
    return jsonify({
        'category_totals': category_totals,
        'monthly_totals': monthly_totals,
        'total_spent': total_spent
    })

if __name__ == '__main__':
    app.run(debug=True)