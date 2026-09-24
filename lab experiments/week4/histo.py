import os

os.environ["TCL_LIBRARY"] = r"C:\Users\anush\AppData\Local\Programs\Python\Python313\tcl\tcl8.6"
os.environ["TK_LIBRARY"] = r"C:\Users\anush\AppData\Local\Programs\Python\Python313\tcl\tk8.6"

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

df = pd.read_csv("student.csv")

sns.histplot(df['Attendance'], bins=20, kde=True)
plt.title("Attendance")
plt.show()