import datetime
import re

# Create a date object
now = datetime.datetime.now()
dayofweek = now.isoweekday()
ddd = now.weekday()

# Get the day of the week as an integer (1=Monday, 7=Sunday)
# day_of_week_iso_int = date_obj.isoweekday()

print(f"The day of the week for {now} (ISO integer): {dayofweek} : {ddd}")
rules = "1053005,2053003,3053003,4053003,5053007,6053005,7053005"
rule_days = rules.split(',')
print(rule_days)
for chunk in rule_days:
  [(day,hh,mi,dur)] = re.findall("(\d)(\d{2})(\d{2})(\d{2})",chunk)
  dt = now.replace(hour=int(hh), minute=int(mi))
  if(dayofweek==int(day)):
    print("The day!")
    if(now > dt):
      print("today but too late!")
    else:
      mins_left = (dt.hour-now.hour)*60 + (dt.minute-now.minute)
      print(f"minutes left:{mins_left}")


  # advance date to desired week day
  def change_date():
    from datetime import datetime, timedelta
    # Original datetime object
    original_date = datetime(2025, 7, 15)  # July 15, 2025 (Tuesday)
    # Desired weekday (e.g., Friday, which is 4)
    desired_weekday = 4
    # Calculate the difference in days
    current_weekday = original_date.weekday()
    days_to_add = (desired_weekday - current_weekday + 7) % 7 # Ensures positive difference
    # Create a new datetime object with the desired weekday
    new_date = original_date + timedelta(days=days_to_add)
    print(f"Original date: {original_date.strftime('%Y-%m-%d, %A')}")
    print(f"New date with desired weekday: {new_date.strftime('%Y-%m-%d, %A')}")
      

