import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np
path = "D:/大学文件/大二下/数据可视化/homework/小组/摘要可视化/"
# 读取原始数据
df = pd.read_csv(path+"data_with_keyword.csv")
df['keyword'] = df['keyword'].fillna('')
# 自定义停用词（你可根据需要调整）
stopwords = [
    "a","about","above","after","again","against","all","am","an","and","any","are","aren't","as",
    "at","be","because","been","before","being","below","between","both","but","by","can't","cannot",
    "could","couldn't","did","didn't","do","does","doesn't","doing","don't","down","during","each",
    "few","for","from","further","had","hadn't","has","hasn't","have","haven't","having","he","he'd",
    "he'll","he's","her","here","here's","hers","herself","him","himself","his","how","how's","i",
    "i'd","i'll","i'm","i've","if","in","into","is","isn't","it","it's","its","itself","let's","me",
    "more","most","mustn't","my","myself","no","nor","not","of","off","on","once","only","or","other",
    "ought","our","ours","ourselves","out","over","own","same","shan't","she","she'd","she'll","she's",
    "should","shouldn't","so","some","such","than","that","that's","the","their","theirs","them",
    "themselves","then","there","there's","these","they","they'd","they'll","they're","they've","this",
    "those","through","to","too","under","until","up","very","was","wasn't","we","we'd","we'll","we're",
    "we've","were","weren't","what","what's","when","when's","where","where's","which","while","who",
    "who's","whom","why","why's","with","won't","would","wouldn't","you","you'd","you'll","you're",
    "you've","your","yours","yourself","yourselves",
    "can","high", "low", "theory", "using", "used", "use","one","two","three","four","five","six","seven","eight","nine","ten",
    "here","found","there"
]

# 定义TfidfVectorizer，分词简单用英文空格，停用词自定义
vectorizer = TfidfVectorizer(stop_words=stopwords, max_features=10000)

# 计算TF-IDF矩阵
tfidf_matrix = vectorizer.fit_transform(df['keyword'])

# 词汇表列表
feature_names = np.array(vectorizer.get_feature_names_out())

top_k = 10
top_keywords_list = []

for row in tfidf_matrix:
    # row是稀疏矩阵行
    if row.nnz == 0:
        top_keywords_list.append("")
        continue
    # 获取该行非零tfidf分数及索引
    indices = row.indices
    data = row.data
    # 按tfidf分数排序
    sorted_idx = data.argsort()[::-1]
    top_indices = indices[sorted_idx][:top_k]
    top_words = feature_names[top_indices]
    top_keywords_list.append(" ".join(top_words))

df['top5_keywords'] = top_keywords_list
df = df.drop(columns=['keyword'])
df = df[['Pub_year','Title','DOI','subject','top5_keywords']]
# 保存新文件
df.to_csv("data_with_top5_keywords_brief.csv", index=False)

print("已生成带top5_keywords字段的新数据文件 data_with_top5_keywords_brief.csv")