window.onload = async function() {
    Date.prototype.addDays = function(days) {
        var date = new Date(this.valueOf());
        date.setDate(date.getDate() + days);
        return date;
    }
    const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
    ];

    const poundsToKilos = (number) => number *  0.45359237;
    const inchesToCm = (number) => number * 2.54;
    const poundsPerMonth = (deficit) => deficit * 30.4 / 3500
    const activityCalories = (activity) => 500*activity 

    const setLoading = async (visible) => {
        document.getElementById('loading').style.opacity = visible ? 1 : 0;
        await new Promise(resolve => setTimeout(resolve, 500));
        document.getElementById('loading').style.display = visible ? 'flex' : 'none';
    }

    const buildBMR = (height, weight, age, gender) => {
        return gender != 'female' ? 
        (10 * poundsToKilos(weight))+(6.25*inchesToCm(height)) - (5 * age) + 5
        :
        (10 * poundsToKilos(weight))+(6.25*inchesToCm(height)) - (5 * age) - 161;

    }

    const daysInMonth = (date) => {
        return new Date(date.getYear(), date.getMonth(), 0).getDate();
    }

    const percentOfMonthInDateRange = (date, dateRange) => {
        const days = daysInMonth(date)
        let sum = 0
        let today = new Date(date.getFullYear(), date.getMonth(), 1);
        for(let i=0;i<days;i++) {
            if(today>=dateRange[0] && today <=dateRange[1]) sum+=1
            today = today.addDays(1)
        }
        return sum/days
    }

    const cheatDayAdjustedCalories = (cheatDaysPerMonth, cheatDaySize, calorieGoal) => calorieGoal - (cheatDaysPerMonth * (cheatDaySize - calorieGoal) / 30.4);

    // TODO: Ramped difficulty settings (hard = linear, easy = exponential)

    const buildPlan = (daysToLose, weightToLose, {
        height, weight, age, gender, activeness, cheatDaysPerMonth
    }) => {
        const firstDay = new Date()
        cheatDaysPerMonth = cheatDaysPerMonth ?? 0
        const averageDailyDeficit = weightToLose*3500/daysToLose
        const averageMonthlyWeightLoss = poundsPerMonth(averageDailyDeficit)
        let plan = []
        let lastMonth;
        let lastMonthWeight = weight
        for(let i=0;i<daysToLose;i++) {
            const today = ((new Date()).addDays(i));
            if(today.getMonth() != lastMonth) {
                const bmr = buildBMR(height, lastMonthWeight, age, gender)
                const calorieGoal = bmr - averageDailyDeficit

                const pctMonthCompleted = percentOfMonthInDateRange(today, [
                    firstDay,
                    firstDay.addDays(daysToLose)
                ])
                lastMonthWeight -= averageMonthlyWeightLoss * pctMonthCompleted
                lastMonth = today.getMonth()
                const activityAdjustedCalorieGoal = calorieGoal + activityCalories(activeness)
                plan.push({
                    month: monthNames[today.getMonth()],
                    calories: Number(cheatDayAdjustedCalories(cheatDaysPerMonth, 1.5*activityAdjustedCalorieGoal, activityAdjustedCalorieGoal).toFixed(0)),
                    weight: Number(lastMonthWeight.toFixed(1))
                })
            }
        }
        return plan
    }

    // Limit planning to 5 lbs per month
    const limitResults = (daysToLose, weightToLose) => {
        const daysPerMonth = 30.416
        let weightPerMonth = weightToLose / (daysToLose/daysPerMonth)
        if(weightPerMonth<=8) return daysToLose
        weightPerMonth = 5
        daysToLose = weightToLose / (weightPerMonth/daysPerMonth)
        return daysToLose
    }

    const buildRow = (month, calories, weight) => {
    	const row = document.createElement('div')
      row.className = 'tr';
      const leftColumn = document.createElement('div')
      leftColumn.className = 'left-columns';
      row.appendChild(leftColumn);
      const monthColumn = document.createElement('div')
      monthColumn.className = 'month-column';
      leftColumn.appendChild(monthColumn);
      const calorieColumn = document.createElement('div')
      calorieColumn.className = 'calorie-column';
      leftColumn.appendChild(calorieColumn);
      const monthLabel = document.createElement('div')
      monthLabel.className = 'th-label';
      monthColumn.appendChild(monthLabel);
      const monthStrong = document.createElement('strong')
      monthLabel.appendChild(monthStrong);
      monthStrong.textContent = month;
      const calorieLabel = document.createElement('div')
      calorieLabel.className = 'th-label';
      calorieColumn.appendChild(calorieLabel);
      const calorieStrong = document.createElement('strong')
      calorieLabel.appendChild(calorieStrong);
      calorieStrong.textContent = calories.toLocaleString();
      const weightColumn = document.createElement('div')
      weightColumn.className = 'weight-column';
      row.appendChild(weightColumn);
      const weightLabel = document.createElement('div')
      weightLabel.className = 'th-label';
      weightColumn.appendChild(weightLabel);
      const weightStrong = document.createElement('strong')
      weightLabel.appendChild(weightStrong);
      weightStrong.textContent = `${weight} lbs`;
      return row
    }

    const params = new Proxy(new URLSearchParams(window.location.search), {
      get: (searchParams, prop) => searchParams.get(prop),
    });
    
    const toggleBreakdown = () => {
    	const calorieBreakdown = document.getElementById('calorie-breakdown');
      const breakdownToggle = document.getElementById('toggle-breakdown');
    	if(calorieBreakdown.style.display == 'none') {
      	calorieBreakdown.style.display = 'flex';
        breakdownToggle.textContent = 'Hide month-by-month breakdown:';
      } else {
      	calorieBreakdown.style.display = 'none';
        breakdownToggle.textContent = 'Show month-by-month breakdown:';
      }
    }

    const roundUpToNearestFive = (x) => Math.ceil(x/5)*5;
    const roundToNearestFive = (x) => Math.round(x/5)*5;

    const getDifferenceInDays = (firstDate, secondDate) => ((secondDate.getTime() - firstDate.getTime()) / (1000 * 3600 * 24)).toFixed(0);
    
    // Set click listener on toggle breakdown
    document.getElementById('toggle-breakdown').onclick = toggleBreakdown;
    
    // Ensure Variables needed to start exist - error handling
    
    // height in inches
    const height = params.heightFeet + params.heightInches
    // weight
    const weight = params.weight;
    // amount of weight to lose in lbs
    const weightToLose = params.weight - params.idealWeight;
    // days to lose weight
    let daysToLose = (params.goalDate && !params.goalDate.includes('_')) ? Number(getDifferenceInDays(new Date(), new Date(params.goalDate))): Math.round((weightToLose/2.5) * 30.4)
    // limit goal to 8lbs/mo
    daysToLose = limitResults(daysToLose, weightToLose)
    const nextDate = new Date(new Date())
    nextDate.setDate(nextDate.getDate() + daysToLose)
    const goalDate = (params.goalDate && !params.goalDate.includes('_')) ? params.goalDate : nextDate.toLocaleDateString()
    // age
    const age = params.age;
    // activeness (0-6)
    const activeness = .75;
    // cheat days per month
    const monthlyCheatDays = 0;
    // name
    const name = `${params.firstName} ${params.lastName}`;
    // biological sex
    const sex = params.sex.toLowerCase()
    // over eating strategy
    document.getElementById('overeating-strat').textContent=`When i over-eat, ${params.overeating.toLowerCase()}`;
    // weight loss strategy (?)
    const strategy = `Keeping my calories aligned with my provided goals with ${params.strategy.toLowerCase()}`
    document.getElementById('lose-strat').textContent=strategy;
    // smart watch
    const smartWatch = params.smartWatch.includes('No,') ? 'provided Apple' : 'smart';
    const buyingSmartWatch = params.smartWatch.includes('No,');
    document.getElementById('smart-watch').textContent = smartWatch;
    // Set iphone upsell
    document.getElementById('apple-watch').style.display = buyingSmartWatch ? 'flex' : 'none';
    // TODO:Ensure variables are provided
    
    // replace template variables
    // Set subtitle
    document.getElementById('page-subtitle').textContent = `Built for ${name} on ${new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).split(',').slice(1).join(', ')}`
    // Set goal weight
    document.getElementById('goal-weight').textContent=weight-weightToLose;
    document.getElementById('goal-weight-2').textContent=weight-weightToLose;
    document.getElementById('goal-weight-3').textContent=weight-weightToLose;

    // Set weight to lose
    document.getElementById('weight-to-lose').textContent = weightToLose;
    // If weight loss goal limit is over 8lbs/month, readjust goal date
    // Set goal dates
    document.getElementById('goal-date').textContent=new Date(goalDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).split(',').slice(1,-1).join(', ')
    document.getElementById('goal-date-2').textContent=new Date(goalDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).split(',').slice(1).join(', ')
    
    // Set cheat day strat
    document.getElementById('cheat-day-strat').textContent= monthlyCheatDays > 0 ? `Taking ${monthlyCheatDays} per month` : 'Staying disciplined and not taking any cheat days';
    // Set tomorrow's date
    const tomorrow = new Date(new Date())
    tomorrow.setDate(tomorrow.getDate() + 1)
    document.getElementById('todays-date').textContent = tomorrow.toLocaleDateString()

    // TODO: Set graph axis
    document.getElementById('top-weight').textContent=roundUpToNearestFive(weight);
    document.getElementById('middle-weight-1').textContent = roundToNearestFive(roundUpToNearestFive(weight)-(weightToLose*.25))
    document.getElementById('middle-weight-2').textContent = roundToNearestFive(roundUpToNearestFive(weight)-(weightToLose*.5))

    // Set Stripe checkout link
    document.getElementById('stripe-checkout').href= buyingSmartWatch ?
        'https://buy.stripe.com/cN2040f5J9wq5FKbIN'
        :
        'https://buy.stripe.com/5kAdUQcXB8sm0lq5kq'
    
    // Fill calorie table
    const plan = buildPlan(
        // Days to lose weight
        daysToLose,
        // Weight to lose
        weightToLose, {
        height,
        weight,
        age,
        sex,
        activeness,
        cheatDaysPerMonth: monthlyCheatDays
    })
    document.getElementById('first-month').textContent = plan[0].month;
    document.getElementById('last-month').textContent = plan[plan.length-1].month;
    if(plan.length<6) {
        if(plan[1]) {document.getElementById('second-month').textContent = plan[1].month;} else {document.getElementById('second-month').style.display = 'none'}
        if(plan[2]) {document.getElementById('third-month').textContent = plan[2].month;} else {document.getElementById('third-month').style.display = 'none'}
        if(plan[3]) {document.getElementById('fourth-month').textContent = plan[3].month;}  else {document.getElementById('fourth-month').style.display = 'none'}
    } else {
        if(plan.length % 2 == 0) {
            // is even
            document.getElementById('second-month').textContent = plan[Number((plan.length/4).toFixed(0))-1].month;
            document.getElementById('third-month').textContent = plan[Number((plan.length/2).toFixed(0))-1].month;
            document.getElementById('fourth-month').style.display = 'none'
        } else {
            document.getElementById('second-month').style.display = 'none'
            document.getElementById('third-month').textContent = plan[Number((plan.length/2).toFixed(0))+1].month;
            document.getElementById('fourth-month').style.display = 'none'
        }
    } 
    
    const table = document.getElementById('calorie-breakdown');

    for(let i=0;i<plan.length;i++) {
        table.appendChild(buildRow(plan[i].month, plan[i].calories, plan[i].weight))
    }
        
    await new Promise(resolve => setTimeout(resolve, 650));
    setLoading(false);
}