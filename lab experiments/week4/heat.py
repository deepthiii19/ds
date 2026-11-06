
import os

os.environ["TCL_LIBRARY"] = r"C:\Users\anush\AppData\Local\Programs\Python\Python313\tcl\tcl8.6"
os.environ["TK_LIBRARY"] = r"C:\Users\anush\AppData\Local\Programs\Python\Python313\tcl\tk8.6"

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
df = pd.read_csv("student.csv")
corr= df.corr(numeric_only=True)
print(corr)
sns.heatmap(corr,annot=True,cmap="Greens")
plt.title("Correlation Matrix")
plt.show()
